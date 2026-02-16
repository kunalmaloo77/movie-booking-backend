const express = require('express');
const { createCinema, findCinemaByCityCode } = require('../controllers/cinemaController.js');
const { verifyToken, adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.post('/create', adminVerification, createCinema);
router.get('/find', verifyToken, findCinemaByCityCode);

module.exports = router;