const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const { createNewShow } = require('../controllers/showsController.js');

const router = express.Router();

router.post('/create', adminVerification, createNewShow);

module.exports = router;