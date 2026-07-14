const express = require('express');
const {
  adminLogin,
  getAdminRevenue,
} = require('../controllers/adminController');
const { adminVerification } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/revenue', adminVerification, getAdminRevenue);

module.exports = router;
