const pool = require("../config/db");
const axios = require("axios");

const { determineSmartCategory } = require('../utils/categoryUtils');

const getUsername = async (pool, userId) => {
  try {
    const res = await pool.query("SELECT username FROM users WHERE user_id = $1", [userId]);
    return res.rows[0]?.username || "Unknown";
  } catch (e) {
    return "Unknown";
  }
};

// Helper: Get or add book to local DB from Google/OpenLibrary ID
const getOrAddBookId = async (client, inputId) => {
  if (!isNaN(inputId)) return parseInt(inputId, 10);

  try {
    const existing = await client.query(
      "SELECT book_id FROM books WHERE google_id = $1",
      [inputId]
    );
    if (existing.rows.length > 0) return existing.rows[0].book_id;

    console.log(`📚 Adding new book: ${inputId}`);

    if (inputId.startsWith("OL_")) {
      const workKey = inputId.replace("OL_", "/works/");

      const [workRes, editionRes] = await Promise.all([
        axios.get(`https://openlibrary.org${workKey}.json`, { timeout: 5000 }),
        axios.get(`https://openlibrary.org${workKey}/editions.json?limit=1`, { timeout: 5000 })
      ]);

      const work = workRes.data;
      const edition = editionRes.data.entries?.[0];


      let authorName = "Unknown";
      if (work.authors?.[0]?.author?.key) {
        try {
          const authorRes = await axios.get(
            `https://openlibrary.org${work.authors[0].author.key}.json`,
            { timeout: 3000 }
          );
          authorName = authorRes.data.name || "Unknown";
        } catch (e) {
          console.warn("Failed to fetch author");
        }
      }

      const isbn = edition?.isbn_13?.[0] || edition?.isbn_10?.[0] || `OL-${inputId}`;


      let category_id = 1;
      if (work.subjects?.length > 0) {
        const catRes = await client.query(
          "SELECT category_id FROM categories WHERE name ILIKE $1",
          [`%${work.subjects[0]}%`]
        );
        if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
      }

      const description = typeof work.description === "string"
        ? work.description
        : work.description?.value || "No description available";


      let coverImage = "https://via.placeholder.com/300x450?text=No+Cover";
      if (work.covers?.[0]) {
        coverImage = `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`;
      } else if (edition?.covers?.[0]) {
        coverImage = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`;
      } else if (edition?.isbn_13?.[0]) {
        coverImage = `https://covers.openlibrary.org/b/isbn/${edition.isbn_13[0]}-L.jpg`;
      }

      const newBook = await client.query(
        `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'available', $8) RETURNING book_id`,
        [
          work.title || "Untitled Book",
          authorName,
          isbn,
          work.first_publish_year,
          category_id,
          coverImage,
          description,
          inputId,
        ]
      );

      console.log(`✅ Added Open Library book: ${work.title}`);
      return newBook.rows[0].book_id;
    }

    if (!inputId.startsWith("OL_")) {
      console.log(`🌐 Fetching Google Book: ${inputId}`);
      const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

      const googleRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes/${inputId}`,
        {
          params: { key: API_KEY },
          timeout: 5000
        }
      );

      const item = googleRes.data;
      const info = item.volumeInfo || {};

      const authorName = info.authors ? info.authors[0] : "Unknown";
      const isbn = info.industryIdentifiers
        ? info.industryIdentifiers[0].identifier
        : `GBOOKS-${inputId}`;


      let category_id = 1;
      const smartCat = determineSmartCategory(info.categories);

      const catRes = await client.query(
        "SELECT category_id FROM categories WHERE name ILIKE $1",
        [`%${smartCat}%`]
      );
      if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;

      const coverImage = info.imageLinks?.thumbnail?.replace('http:', 'https:') ||
        info.imageLinks?.smallThumbnail?.replace('http:', 'https:') ||
        "https://via.placeholder.com/300x450?text=No+Cover";

      const description = info.description || "No description available";

      const newBook = await client.query(
        `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'available', $8) RETURNING book_id`,
        [
          info.title || "Untitled Book",
          authorName,
          isbn,
          info.publishedDate ? info.publishedDate.substring(0, 4) : null,
          category_id,
          coverImage,
          description,
          inputId,
        ]
      );

      console.log(`✅ Added Google Book: ${info.title} (ID: ${newBook.rows[0].book_id})`);
      return newBook.rows[0].book_id;
    }


    throw new Error("Unsupported book ID format");

  } catch (err) {
    console.error("🔥 Error processing book:", err.message);
    throw new Error("Cannot process this book data. Please try again later.");
  }
};

// Borrow a book (creates loan record and updates status)
exports.borrowBook = async (req, res) => {
  const { book_id, hours } = req.body;
  const user_id = req.user.id || req.user.user_id;
  const username = req.user.username || await getUsername(pool, user_id);

  console.log("📥 Borrow request:", { book_id, hours, user_id });

  if (!book_id) return res.status(400).json("Book ID required");

  const borrowHours = parseFloat(hours) || 168.0;
  if (borrowHours <= 0 || borrowHours > 720) {
    return res.status(400).json("Invalid duration (5 min to 30 days)");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔍 Processing book_id:", book_id);
    const realBookId = await getOrAddBookId(client, book_id);
    console.log("✅ Real book_id:", realBookId);


    const existingLoan = await client.query(
      "SELECT * FROM loans WHERE book_id = $1 AND user_id = $2 AND status = 'active'",
      [realBookId, user_id]
    );

    if (existingLoan.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json("You already borrowed this book");
    }


    const bookCheck = await client.query(
      "SELECT status, title FROM books WHERE book_id = $1",
      [realBookId]
    );

    if (bookCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Book not found after adding");
    }

    if (bookCheck.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json("Book is currently borrowed by another user");
    }


    const [activeLoans, userInfo] = await Promise.all([
      client.query(
        "SELECT COUNT(*) as count FROM loans WHERE user_id = $1 AND status = 'active'",
        [user_id]
      ),
      client.query("SELECT borrow_limit FROM users WHERE user_id = $1", [user_id]),
    ]);

    const borrowLimit = userInfo.rows[0]?.borrow_limit || 5;
    const currentCount = parseInt(activeLoans.rows[0].count);

    console.log(`📊 User borrow status: ${currentCount}/${borrowLimit}`);

    if (currentCount >= borrowLimit) {
      await client.query("ROLLBACK");
      return res.status(400).json(`You can only borrow ${borrowLimit} books at a time`);
    }


    const dueDate = new Date(Date.now() + borrowHours * 60 * 60 * 1000);
    const newLoan = await client.query(
      `INSERT INTO loans (book_id, user_id, loan_date, due_date, status) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'active') RETURNING *`,
      [realBookId, user_id, dueDate]
    );


    await client.query("UPDATE books SET status = 'borrowed' WHERE book_id = $1", [realBookId]);

    await client.query("COMMIT");

    console.log(`📚 User '${username}' borrowed '${bookCheck.rows[0].title}' for ${borrowHours}h`);

    res.json({
      ...newLoan.rows[0],
      book_title: bookCheck.rows[0].title,
      hours: borrowHours,
      message: "Book borrowed successfully"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Borrow Error:", err.message);


    const errorMessage = err.message.includes("Cannot process")
      ? err.message
      : "Failed to borrow book. Please try again.";

    res.status(500).json(errorMessage);
  } finally {
    client.release();
  }
};

// Return a borrowed book and process next queue
exports.returnBook = async (req, res) => {
  const { book_id } = req.body;
  const user_id = req.user.id || req.user.user_id;
  const username = req.user.username || await getUsername(pool, user_id);

  if (!book_id) return res.status(400).json("Book ID required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");


    const loan = await client.query(
      `SELECT l.*, b.title FROM loans l 
       JOIN books b ON l.book_id = b.book_id
       WHERE l.book_id = $1 AND l.user_id = $2 AND l.status = 'active'`,
      [book_id, user_id]
    );

    if (loan.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Active loan not found");
    }


    await client.query(
      "UPDATE loans SET status = 'returned', return_date = CURRENT_TIMESTAMP WHERE loan_id = $1",
      [loan.rows[0].loan_id]
    );


    const { processNextInQueue } = require("./reservationController");
    const queueResult = await processNextInQueue(client, book_id);

    await client.query("COMMIT");

    console.log(`↩️ User '${username}' returned '${loan.rows[0].title}'`);

    res.json({
      message: "Book returned successfully",
      queueStatus: queueResult.hasQueue
        ? queueResult.autoBorrowed
          ? `Auto-borrowed by next user`
          : `Ready for next user`
        : "Book now available",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Return Error:", err);
    res.status(500).json("Failed to return book: " + err.message);
  } finally {
    client.release();
  }
};

// Get current user's loan history
exports.getMyLoans = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;

  try {
    const userRes = await pool.query("SELECT username FROM users WHERE user_id = $1", [user_id]);
    const username = userRes.rows[0]?.username || "Unknown API User";

    console.log(`🔌 Connected to PostgreSQL database (loans: ${username})`);

    const result = await pool.query(
      `SELECT l.*, b.title, b.cover_image, b.author, b.book_id
       FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.user_id = $1 
       ORDER BY l.loan_date DESC`,
      [user_id]
    );

    console.log(`📚 User '${username}' has ${result.rows.length} loans`);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ Get Loans Error:", err);
    res.status(500).json("Failed to get loans");
  }
};

// Get overdue loans for the current user
exports.getOverdueLoans = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT l.*, b.title, b.cover_image, b.author 
       FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.user_id = $1 AND l.status = 'active' AND l.due_date < NOW()
       ORDER BY l.due_date ASC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Get Overdue Error:", err);
    res.status(500).json("Failed to get overdue loans");
  }
};
// System Job: Auto-return loans that have passed due date
exports.autoReturnExpiredLoans = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expiredLoans = await client.query(
      `SELECT l.*, b.title FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.status = 'active' AND l.due_date < NOW()`
    );

    console.log(`📚 [AUTO-RETURN] Found ${expiredLoans.rows.length} expired loans`);

    for (const loan of expiredLoans.rows) {
      await client.query(
        "UPDATE loans SET status = 'returned', return_date = CURRENT_TIMESTAMP WHERE loan_id = $1",
        [loan.loan_id]
      );

      const { processNextInQueue } = require("./reservationController");
      await processNextInQueue(client, loan.book_id);

      console.log(`✅ [AUTO-RETURN] Returned: ${loan.title} (loan_id: ${loan.loan_id})`);
    }

    await client.query("COMMIT");

    if (res) {
      res.json({
        message: "Auto-return completed",
        count: expiredLoans.rows.length
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [AUTO-RETURN] Error:", err.message);
    if (res) res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};