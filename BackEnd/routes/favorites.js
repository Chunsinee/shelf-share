const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', favoriteController.addFavorite);
router.delete('/:id', favoriteController.removeFavorite);
router.get('/', favoriteController.getMyFavorites);

module.exports = router;
