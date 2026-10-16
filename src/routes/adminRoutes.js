const express = require('express');
const {
  adminLogin,
  getAdminRevenue,
  getTopMovies,
  getDailyBookings,
} = require('../controllers/adminController');
const { adminVerification } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/revenue', adminVerification, getAdminRevenue);
router.get('/movies/top', adminVerification, getTopMovies);
router.get('/bookings/daily', adminVerification, getDailyBookings);

module.exports = router;
