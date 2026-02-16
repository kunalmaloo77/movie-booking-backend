const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware');
const { createNewGenre, createNewMovie, getMoviesByRegion } = require('../controllers/movieController');

const router = express.Router();

router.post('/genre/create', adminVerification, createNewGenre);
router.post('/create', adminVerification, createNewMovie);
router.get('/region/:id', getMoviesByRegion);

module.exports = router;
