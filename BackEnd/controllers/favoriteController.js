const pool = require("../config/db");

exports.addFavorite = async (req, res) => {
  const { book } = req.body; 
  const user_id = req.user.id || req.user.user_id;
  const username = req.user.username || "User"; 

  if (!book) return res.status(400).json({ error: "Book data is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    
    let book_id = book.book_id;
    const google_id = book.google_id || book.id; 

    
    if (!book_id || isNaN(book_id)) {
      const checkBook = await client.query(
        "SELECT book_id FROM books WHERE google_id = $1 OR (title = $2 AND author = $3)",
        [google_id, book.title, book.author]
      );

      if (checkBook.rows.length > 0) {
        book_id = checkBook.rows[0].book_id;
      } else {
        
        
        let category_id = 1; 
        if (book.category || book.category_name) {
          const catName = book.category_name || book.category;
          const catRes = await client.query("SELECT category_id FROM categories WHERE name ILIKE $1", [catName]);
          if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
        }

        const newBook = await client.query(
          `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, google_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available')
            RETURNING book_id`,
          [
            book.title,
            book.author || "Unknown",
            book.isbn || "",
            book.published_year || null,
            category_id,
            book.cover_image,
            book.description,
            google_id
          ]
        );
        book_id = newBook.rows[0].book_id;
      }
    }

    
    const result = await client.query(
      `INSERT INTO favorites (user_id, book_id) VALUES ($1, $2) ON CONFLICT (user_id, book_id) DO NOTHING`,
      [user_id, book_id]
    );

    await client.query("COMMIT");

    if (result.rowCount > 0) {
      console.log(`❤️ User '${username}' liked book '${book.title}'`); 
    }

    res.json({ message: "Added to favorites", book_id });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Add Favorite Error:", err);
    res.status(500).json({ error: "Failed to add favorite" });
  } finally {
    client.release();
  }
};

exports.removeFavorite = async (req, res) => {
  const { id } = req.params; 
  const user_id = req.user.id || req.user.user_id;
  const username = req.user.username || "User"; 

  try {
    
    let target_book_id = id;

    if (isNaN(id)) {
      const bookRes = await pool.query("SELECT book_id FROM books WHERE google_id = $1", [id]);
      if (bookRes.rows.length > 0) target_book_id = bookRes.rows[0].book_id;
      else return res.status(404).json({ error: "Book not found" });
    }

    
    const bookTitleRes = await pool.query("SELECT title FROM books WHERE book_id = $1", [target_book_id]);
    const bookTitle = bookTitleRes.rows[0]?.title || "Unknown Book";

    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND book_id = $2",
      [user_id, target_book_id]
    );

    console.log(`💔 User '${username}' unliked book '${bookTitle}'`); 

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error("Remove Favorite Error:", err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
};

exports.getMyFavorites = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT 
        b.*, 
        c.name as category_name,
        f.created_at as favorited_at,
        (SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id) as borrow_count,
        (SELECT COALESCE(AVG(rating), 0)::float FROM reviews rv WHERE rv.book_id = b.book_id) as avg_rating
      FROM favorites f
      JOIN books b ON f.book_id = b.book_id
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [user_id]);

    const formatted = result.rows.map(book => ({
      ...book,
      id: book.book_id,
      google_id: book.google_id || String(book.book_id),
      status: 'available', 
      avg_rating: parseFloat(book.avg_rating || 0).toFixed(1),
      borrow_count: parseInt(book.borrow_count || 0)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Get Favorites Error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
};
