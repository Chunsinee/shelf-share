
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/suggest', bookController.getSuggestions);

router.get('/search', bookController.searchBooks);

router.get('/', bookController.getAllBooks);

router.get('/:id', bookController.getBookById);

router.post('/', authMiddleware, bookController.addBook);

module.exports = router;