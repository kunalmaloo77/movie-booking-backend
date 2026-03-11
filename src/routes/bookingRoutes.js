const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware.js');
const {
  createNewBooking,
  getBookingsByUserId,
} = require('../controllers/bookingController.js');

const router = express.Router();

router.post('/', verifyToken, createNewBooking);
router.get('/user/:user_id', verifyToken, getBookingsByUserId);

module.exports = router;
