const express = require('express');
const {
  createScreenController,
  getScreensByCinemaId,
  getScreenById,
  getSeatCategoriesByScreen,
  createScreenTypeController,
  getScreenTypesController,
  deleteScreenController,
  updateScreenController,
} = require('../controllers/screenController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/', adminVerification, createScreenController);
router.post('/screen-type', adminVerification, createScreenTypeController);
router.patch('/:screen_id', adminVerification, updateScreenController);
router.get('/screen-types', adminVerification, getScreenTypesController);
router.get(
  '/:screen_id/seat-categories',
  adminVerification,
  getSeatCategoriesByScreen
);
router.get('/cinema/:cinema_id', getScreensByCinemaId);
router.get('/:id', getScreenById);
router.delete('/:id', adminVerification, deleteScreenController);

module.exports = router;
