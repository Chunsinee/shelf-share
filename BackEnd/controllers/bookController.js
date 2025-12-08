
const pool = require('../config/db');
const axios = require('axios');

const { determineSmartCategory } = require('../utils/categoryUtils');

const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

const CATEGORY_MAPPING = {
  'Fiction': 'subject:fiction',
  'Non-Fiction': 'subject:nonfiction',
  'Technology': 'subject:computers',
  'Science': 'subject:science',
  'History': 'subject:history',
  'Business': 'subject:business',
  'Art & Design': 'subject:art',
  'Biography': 'subject:biography'
};

const getCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Helper: Determine category string for Google Books
// const determineSmartCategory = require('../utils/categoryUtils').determineSmartCategory;

// Helper: Enrich book data with local stats (queue, borrow count, rating)
const enrichBooksWithStats = async (googleBooks) => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("⚠️ DB Connection failed (Skipping stats):", err.message);
    return googleBooks;
  }

  try {
    const ids = googleBooks.map(b => `'${b.google_id}'`).join(',');
    if (!ids) return googleBooks;

    const statsQuery = `
      SELECT 
        b.google_id, b.book_id, b.status as db_status,
        COALESCE(COUNT(DISTINCT l.loan_id), 0)::int as borrow_count,
        COALESCE(COUNT(DISTINCT r.reservation_id) FILTER (WHERE r.status = 'active'), 0)::int as queue_count,
        COALESCE(AVG(rv.rating), 0)::float as avg_rating,
        COALESCE(COUNT(DISTINCT rv.review_id), 0)::int as review_count,
        EXISTS(SELECT 1 FROM loans WHERE book_id = b.book_id AND status = 'active') as is_borrowed
      FROM books b
      LEFT JOIN loans l ON b.book_id = l.book_id
      LEFT JOIN reservations r ON b.book_id = r.book_id
      LEFT JOIN reviews rv ON b.book_id = rv.book_id
      WHERE b.google_id IN (${ids})
      GROUP BY b.google_id, b.book_id, b.status
    `;

    const statsResult = await client.query(statsQuery);
    const statsMap = new Map();
    statsResult.rows.forEach(row => statsMap.set(row.google_id, row));

    return googleBooks.map(book => {
      const stats = statsMap.get(book.google_id) || {};
      let actualStatus = stats.is_borrowed ? 'borrowed' : (stats.db_status || 'available');

      return {
        ...book,
        book_id: stats.book_id || book.google_id,
        status: actualStatus,
        borrow_count: parseInt(stats.borrow_count || 0),
        queue_count: parseInt(stats.queue_count || 0),
        avg_rating: parseFloat(stats.avg_rating || 0).toFixed(1),
        review_count: parseInt(stats.review_count || 0)
      };
    });
  } catch (err) {
    console.error("⚠️ Enrich stats error:", err.message);
    return googleBooks;
  } finally {
    if (client) client.release();
  }
};

// Sync book availability status based on active loans
exports.syncBookStatuses = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const activeLoanBooks = await client.query(`SELECT DISTINCT book_id FROM loans WHERE status = 'active'`);
    const activeBookIds = activeLoanBooks.rows.map(r => r.book_id);

    if (activeBookIds.length > 0) {
      await client.query(
        `UPDATE books SET status = 'borrowed' WHERE book_id = ANY($1) AND status != 'borrowed'`,
        [activeBookIds]
      );
    }

    const availableBooks = await client.query(`
      UPDATE books SET status = 'available'
      WHERE book_id NOT IN (SELECT DISTINCT book_id FROM loans WHERE status = 'active')
      AND book_id NOT IN (SELECT DISTINCT book_id FROM reservations WHERE status IN ('active', 'ready'))
      AND status != 'available'
      RETURNING book_id, title
    `);

    await client.query('COMMIT');
    return { success: true, count: availableBooks.rows.length };
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ Sync Error:', err.message);
    return { success: false, error: err.message };
  } finally {
    if (client) client.release();
  }
};

// Search books via Google Books API and Local DB
exports.searchBooks = async (req, res) => {
  const { query } = req.query;
  const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

  try {
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      const cacheKey = `search:${searchTerm}`;
      const cachedResult = getCache(cacheKey);
      if (cachedResult) return res.json(cachedResult);

      console.log(`🔍 Searching: "${searchTerm}"`);


      const [res1, res2] = await Promise.allSettled([
        axios.get(`https://www.googleapis.com/books/v1/volumes`, {
          params: {
            q: searchTerm,
            maxResults: 40,
            langRestrict: 'en',
            printType: 'books',
            orderBy: 'relevance',
            key: API_KEY
          }
        }),
        axios.get(`https://www.googleapis.com/books/v1/volumes`, {
          params: {
            q: searchTerm,
            startIndex: 40,
            maxResults: 40,
            printType: 'books',
            langRestrict: 'en',
            orderBy: 'relevance',
            key: API_KEY
          }
        })
      ]);

      let rawItems = [];
      if (res1.status === 'fulfilled') rawItems.push(...(res1.value.data.items || []));
      if (res2.status === 'fulfilled') rawItems.push(...(res2.value.data.items || []));

      const seen = new Set();
      let items = rawItems
        .filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .map(item => {
          const info = item.volumeInfo || {};
          return {
            google_id: item.id,
            id: item.id,
            title: info.title || "No Title",
            author: info.authors ? info.authors[0] : "Unknown",
            description: info.description || "",
            cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
            published_year: info.publishedDate?.substring(0, 4) || null,
            category: determineSmartCategory(info.categories),
            category_name: determineSmartCategory(info.categories),
            status: 'available'
          };
        });

      if (items.length > 0) items = await enrichBooksWithStats(items);
      setCache(cacheKey, items);
      return res.json(items);

    } else {

      const cacheKey = 'homepage:books';
      const cachedResult = getCache(cacheKey);
      if (cachedResult) return res.json(cachedResult);

      console.log("🏠 Loading Homepage Books...");

      const allBooks = [];
      const globalSeenIds = new Set();

      for (const [catName, searchTerm] of Object.entries(CATEGORY_MAPPING)) {
        try {
          const response = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
            params: {
              q: searchTerm,
              maxResults: 15,
              langRestrict: 'en',
              printType: 'books',
              key: API_KEY
            }
          });

          const items = response.data.items || [];
          let addedCount = 0;

          for (const item of items) {
            if (addedCount >= 10 || globalSeenIds.has(item.id)) continue;

            const info = item.volumeInfo || {};
            allBooks.push({
              google_id: item.id,
              id: item.id,
              title: info.title || "No Title",
              author: info.authors ? info.authors[0] : "Unknown",
              description: info.description || "",
              cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
              published_year: info.publishedDate?.substring(0, 4) || null,
              category: catName,
              category_name: catName,
              status: 'available',
              is_google_book: true
            });

            globalSeenIds.add(item.id);
            addedCount++;
          }
        } catch (e) {
          console.error(`⚠️ Failed category ${catName}:`, e.message);
        }
      }

      if (allBooks.length > 0) {
        const enrichedBooks = await enrichBooksWithStats(allBooks);
        setCache(cacheKey, enrichedBooks);
        return res.json(enrichedBooks);
      } else {
        console.error("❌ No books from Google API");
        return res.json([]);
      }
    }
  } catch (err) {
    console.error("🔥 Error in searchBooks:", err.message);
    res.json([]);
  }
};

// Add a new book to the library
exports.addBook = async (req, res) => {
  const { title, author, isbn, published_year, category_name, cover_image, description, google_id } = req.body;
  const owner_id = req.user ? (req.user.id || req.user.user_id) : 1;

  try {
    const checkDup = await pool.query(
      "SELECT * FROM books WHERE isbn = $1 OR title = $2 OR google_id = $3",
      [isbn, title, google_id]
    );

    if (checkDup.rows.length > 0) return res.json(checkDup.rows[0]);

    let category_id = 1;
    if (category_name) {
      const catRes = await pool.query("SELECT category_id FROM categories WHERE name ILIKE $1", [category_name]);
      if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
    }

    const newBook = await pool.query(
      `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9) RETURNING *`,
      [title, author, isbn, published_year, category_id, cover_image, description, owner_id, google_id]
    );

    res.json(newBook.rows[0]);
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
};

// Get all books from the local database
exports.getAllBooks = async (req, res) => {
  try {
    const allBooks = await pool.query(`
      SELECT b.*, c.name as category_name,
        EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.status = 'active') as is_borrowed,
        COALESCE((SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id), 0) as borrow_count,
        COALESCE((SELECT COUNT(*)::int FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'active'), 0) as queue_count,
        COALESCE((SELECT AVG(rating)::float FROM reviews rv WHERE rv.book_id = b.book_id), 0) as avg_rating,
        COALESCE((SELECT COUNT(*)::int FROM reviews rv WHERE rv.book_id = b.book_id), 0) as review_count
      FROM books b 
      LEFT JOIN categories c ON b.category_id = c.category_id 
      ORDER BY b.book_id DESC
    `);

    const booksWithStatus = allBooks.rows.map(book => ({
      ...book,
      id: book.book_id,
      status: book.is_borrowed ? 'borrowed' : 'available',
      category: book.category_name || "General",
      avg_rating: parseFloat(book.avg_rating || 0).toFixed(1),
      review_count: parseInt(book.review_count || 0),
      borrow_count: parseInt(book.borrow_count || 0),
      queue_count: parseInt(book.queue_count || 0)
    }));

    res.json(booksWithStatus);
  } catch (err) {
    console.error("getAllBooks Error:", err.message);
    res.status(500).send('Server Error');
  }
};

// Get detailed book information by ID (Local or Google)
exports.getBookById = async (req, res) => {
  const { id } = req.params;
  const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
  let client;

  try {
    client = await pool.connect();
    let bookData = null;
    let isGoogle = false;

    console.log(`🔍 [GET-BOOK] Searching for ID: ${id}`);


    const query = `
      SELECT b.*, c.name as category_name,
        EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.status = 'active') as is_borrowed,
        (SELECT COUNT(*)::int FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'active') as queue_count,
        (SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id) as borrow_count,
        (SELECT COALESCE(AVG(rating), 0)::float FROM reviews r WHERE r.book_id = b.book_id) as avg_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.book_id = b.book_id) as review_count
      FROM books b 
      LEFT JOIN categories c ON b.category_id = c.category_id 
      WHERE b.book_id::text = $1 OR b.google_id = $1
    `;

    const result = await client.query(query, [id]);
    if (result.rows.length > 0) {
      bookData = result.rows[0];
      console.log(`✅ [GET-BOOK] Found in DB: ${bookData.title}`);
    }


    if (!bookData) {
      console.log(`🌐 [GET-BOOK] Not in DB, fetching from Google Books API...`);

      try {
        const googleRes = await axios.get(
          `https://www.googleapis.com/books/v1/volumes/${id}`,
          {
            params: { key: API_KEY },
            timeout: 10000
          }
        );

        if (!googleRes.data || !googleRes.data.volumeInfo) {
          throw new Error('Invalid response from Google Books API');
        }

        const item = googleRes.data;
        const info = item.volumeInfo || {};
        const isbn = info.industryIdentifiers
          ? info.industryIdentifiers[0].identifier
          : `GBOOKS-${id}`;

        console.log(`✅ [GET-BOOK] Fetched from Google: ${info.title}`);


        const existing = await client.query(
          "SELECT * FROM books WHERE title = $1 OR isbn = $2 OR google_id = $3",
          [info.title, isbn, id]
        );

        if (existing.rows.length > 0) {
          console.log(`⚠️ [GET-BOOK] Book exists in DB, using local record...`);
          bookData = existing.rows[0];
          isGoogle = false;

        } else {
          // ถ้าไม่เจอใน DB → ใช้ข้อมูลจาก Google API
          isGoogle = true;
          const categoryName = determineSmartCategory(info.categories);

          bookData = {
            google_id: item.id,
            book_id: item.id,
            title: info.title || "No Title",
            author: info.authors ? info.authors.join(', ') : "Unknown",
            isbn: isbn,
            description: info.description || "No description available",
            cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') ||
              info.imageLinks?.smallThumbnail?.replace('http:', 'https:') ||
              null,
            published_year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
            category_name: categoryName,
            category: categoryName,
            status: 'available',
            queue_count: 0,
            borrow_count: 0,
            avg_rating: 0,
            review_count: 0,
            is_borrowed: false
          };

          console.log(`✅ [GET-BOOK] Google book data prepared: ${bookData.title}`);
        }

      } catch (googleError) {
        console.error(`❌ [GET-BOOK] Google API Error:`, googleError.message);


        client.release();
        return res.status(404).json({
          error: "Book not found",
          message: `Could not find book with ID: ${id}`,
          details: googleError.message,
          googleId: id
        });
      }
    }


    const response = {
      ...bookData,
      status: bookData.is_borrowed ? 'borrowed' : (bookData.status || 'available'),
      is_google_book: isGoogle,
      book_id: bookData.book_id || bookData.google_id
    };

    console.log(`✅ [GET-BOOK] Sending response for: ${response.title}`);
    client.release();
    res.json(response);

  } catch (err) {
    console.error("❌ [GET-BOOK] Fatal Error:", err.message);
    if (client) client.release();
    res.status(500).json({
      error: "Server Error",
      message: err.message
    });
  }
};

// Get book suggestions for autocomplete
exports.getSuggestions = async (req, res) => {
  const { query } = req.query;

  try {
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

      const cacheKey = `suggest:${searchTerm}`;
      const cachedResult = getCache(cacheKey);
      if (cachedResult) return res.json(cachedResult);

      let dbResRows = [];
      try {
        const dbRes = await pool.query(
          `SELECT book_id, google_id, title, author, cover_image, category_id 
           FROM books 
           WHERE LOWER(title) LIKE $1 OR LOWER(author) LIKE $1 
           LIMIT 5`,
          [`%${searchTerm}%`]
        );
        dbResRows = dbRes.rows;
      } catch (err) {
        console.warn("DB Suggestion Error:", err.message);
      }

      let googleBooks = [];
      try {
        const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
          params: {
            q: searchTerm,
            maxResults: 6,
            printType: 'books',
            langRestrict: 'en',
            fields: 'items(id,volumeInfo(title,authors,imageLinks))',
            key: API_KEY
          }
        });

        if (googleRes.data.items) {
          googleBooks = googleRes.data.items.map(item => {
            const info = item.volumeInfo || {};
            return {
              google_id: item.id,
              id: item.id,
              book_id: null,
              title: info.title || "No Title",
              author: info.authors ? info.authors[0] : "Unknown",
              cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
              source: 'google'
            };
          });
        }
      } catch (err) {
        console.warn("Google Suggest Error:", err.message);
      }

      const combined = [...dbResRows, ...googleBooks];
      const uniqueSuggestions = [];
      const seenKeys = new Set();

      // Clean title and author for comparison
      combined.forEach(book => {
        const cleanTitle = book.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        const cleanAuthor = book.author ? book.author.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") : "";
        const key = `${cleanTitle}-${cleanAuthor}`;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueSuggestions.push({
            id: book.book_id || book.google_id,
            title: book.title,
            author: book.author,
            cover_image: book.cover_image,
            is_local: !!book.book_id
          });
        }
      });

      const finalResult = uniqueSuggestions.slice(0, 8);
      setCache(cacheKey, finalResult);
      return res.json(finalResult);

    } else {
      try {
        const result = await pool.query(`
          SELECT b.book_id as id, b.title, b.author, b.cover_image, c.name as category_name
          FROM books b
          LEFT JOIN categories c ON b.category_id = c.category_id
          ORDER BY RANDOM() LIMIT 5
        `);
        return res.json(result.rows);
      } catch (err) {
        console.warn("Random Suggestion Error:", err.message);
        return res.json([]);
      }
    }
  } catch (err) {
    console.error("Suggestion Error:", err.message);
    res.status(500).json([]);
  }
};