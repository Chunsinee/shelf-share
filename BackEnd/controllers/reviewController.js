
const pool = require('../config/db');

exports.getBookReviews = async (req, res) => {
  const { book_id } = req.params;

  if (isNaN(book_id)) {
      return res.json([]); 
  }

  try {
    const reviews = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.username, r.user_id 
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.book_id = $1
       ORDER BY r.created_at DESC`,
      [book_id]
    );

    res.json(reviews.rows);
  } catch (err) {
    console.error("Get Reviews Error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.addReview = async (req, res) => {
  const { book_id, rating, comment } = req.body;
  const user_id = req.user.id || req.user.user_id;

  if (!book_id || !rating) {
      return res.status(400).json({ message: "Book ID and Rating are required" });
  }

  if (isNaN(book_id)) {
      return res.status(400).json({ message: "Cannot review this book yet. Please borrow or reserve it first to add it to our system." });
  }

  try {
    const existingReview = await pool.query(
        "SELECT review_id FROM reviews WHERE book_id = $1 AND user_id = $2",
        [book_id, user_id]
    );

    if (existingReview.rows.length > 0) {
        return res.status(400).json({ message: "You have already reviewed this book." });
    }

    const newReview = await pool.query(
      `INSERT INTO reviews (book_id, user_id, rating, comment, created_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [book_id, user_id, rating, comment]
    );

    const user = await pool.query("SELECT username FROM users WHERE user_id = $1", [user_id]);
    
    res.json({
        ...newReview.rows[0],
        username: user.rows[0].username
    });

  } catch (err) {
    console.error("Add Review Error:", err.message);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
};

exports.updateReview = async (req, res) => {
    const { review_id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id || req.user.user_id;

    if (!rating) {
        return res.status(400).json({ message: "Rating is required" });
    }

    try {
        
        const review = await pool.query(
            "SELECT user_id FROM reviews WHERE review_id = $1", 
            [review_id]
        );
        
        if (review.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }
        
        if (review.rows[0].user_id !== user_id) {
            return res.status(403).json({ message: "You can only edit your own reviews" });
        }

        
        const updatedReview = await pool.query(
            `UPDATE reviews 
             SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP 
             WHERE review_id = $3 
             RETURNING *`,
            [rating, comment, review_id]
        );

        
        const user = await pool.query(
            "SELECT username FROM users WHERE user_id = $1", 
            [user_id]
        );

        res.json({
            ...updatedReview.rows[0],
            username: user.rows[0].username
        });

    } catch (err) {
        console.error("Update Review Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.deleteReview = async (req, res) => {
    const { review_id } = req.params;
    const user_id = req.user.id || req.user.user_id;

    try {
        const review = await pool.query(
            "SELECT user_id FROM reviews WHERE review_id = $1", 
            [review_id]
        );
        
        if (review.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }
        
        if (review.rows[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await pool.query("DELETE FROM reviews WHERE review_id = $1", [review_id]);
        res.json({ message: "Review deleted successfully" });
        
    } catch (err) {
        console.error("Delete Review Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};