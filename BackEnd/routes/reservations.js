
const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middleware/authMiddleware'); 

router.post('/', authMiddleware, reservationController.createReservation);

router.get('/my-reservations', authMiddleware, reservationController.getMyReservations);

router.delete('/:reservation_id', authMiddleware, reservationController.cancelReservation);

router.post('/process-expired', reservationController.processExpiredReservations);

module.exports = router;