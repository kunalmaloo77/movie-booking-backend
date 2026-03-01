const express = require('express');
const {
  createScreenController,
  getScreensByCinemaId,
  getScreenById,
} = require('../controllers/screenController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/', adminVerification, createScreenController);
router.get('/cinema/:cinema_id', getScreensByCinemaId);
router.get('/:id', getScreenById);

module.exports = router;
