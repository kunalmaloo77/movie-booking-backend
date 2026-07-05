const express = require('express');
const {
  createRegionController,
  findRegionsController,
  updateRegionController,
  deleteRegionController,
} = require('../controllers/regionController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/', adminVerification, createRegionController);
router.get('/', findRegionsController);
router.put('/:id', adminVerification, updateRegionController);
router.delete('/:id', adminVerification, deleteRegionController);

module.exports = router;
