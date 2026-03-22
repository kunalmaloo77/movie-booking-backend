const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware.js');
const {
  createNewBooking,
  verifyBookingPayment,
  razorpayWebhook,
  getBookingsByUserId,
} = require('../controllers/bookingController.js');

const router = express.Router();

router.post('/', verifyToken, createNewBooking);
router.post('/verify', verifyBookingPayment);              // public — secured by Razorpay signature
router.post('/webhook', razorpayWebhook); // public — secured by Razorpay webhook signature
router.get('/user/:user_id', verifyToken, getBookingsByUserId);

module.exports = router;
