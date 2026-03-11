const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  handleCreateSeatCategory,
  handleCreateSeat,
  getSeatsByScreenId,
} = require('../controllers/seatsController.js');

const router = express.Router();

router.post('/categories', adminVerification, handleCreateSeatCategory);
router.post('/', adminVerification, handleCreateSeat);
router.get('/screen/:screen_id', getSeatsByScreenId);

module.exports = router;
