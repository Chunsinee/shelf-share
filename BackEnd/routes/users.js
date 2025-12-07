
const router = require('express').Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/subscribe-newsletter', userController.subscribeNewsletter);

router.get('/profile', authMiddleware, userController.getProfile); 
router.put('/profile', authMiddleware, userController.updateProfile); 
router.put('/change-password', authMiddleware, userController.changePassword);

router.get('/is-verify', authMiddleware, (req, res) => res.json(true));

module.exports = router;