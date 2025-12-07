
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:book_id', reviewController.getBookReviews);

router.post('/', authMiddleware, reviewController.addReview);

router.delete('/:review_id', authMiddleware, reviewController.deleteReview);

module.exports = router;