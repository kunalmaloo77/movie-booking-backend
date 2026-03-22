const express = require('express');
const {
  createScreenController,
  getScreensByCinemaId,
  getScreenById,
  getSeatCategoriesByScreen,
  createScreenTypeController,
  getScreenTypesController,
} = require('../controllers/screenController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');
const { get } = require('../../../client/src/api.js');

const router = express.Router();

router.post('/', adminVerification, createScreenController);
router.post('/screen-type', adminVerification, createScreenTypeController);
router.get('/screen-types', adminVerification, getScreenTypesController);
router.get(
  '/:screen_id/seat-categories',
  adminVerification,
  getSeatCategoriesByScreen
);
router.get('/cinema/:cinema_id', getScreensByCinemaId);
router.get('/:id', getScreenById);

module.exports = router;
