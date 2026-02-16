const express = require('express');
const { createRegionController, findRegionByCityCodeController } = require('../controllers/regionController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/create', adminVerification, createRegionController);
router.get('/find', adminVerification, findRegionByCityCodeController);

module.exports = router;