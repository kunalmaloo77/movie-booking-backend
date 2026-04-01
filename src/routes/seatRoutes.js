const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  handleCreateSeatCategory,
  handleCreateSeat,
  getSeatsByScreenId,
  handleGetSeatCategories,
  handleGetSeatCategoriesByScreenId,
} = require('../controllers/seatsController.js');

const router = express.Router();

router.get('/categories/:screen_id', handleGetSeatCategoriesByScreenId);
router.get('/categories', handleGetSeatCategories);
router.post('/categories', adminVerification, handleCreateSeatCategory);
router.post('/', adminVerification, handleCreateSeat);
router.get('/screen/:screen_id', getSeatsByScreenId);

module.exports = router;
