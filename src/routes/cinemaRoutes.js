const express = require('express');
const {
  createCinema,
  findCinemaByMovieIdAndRegionId,
  findCinemaByRegionId,
  searchCinemas,
} = require('../controllers/cinemaController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/', adminVerification, createCinema);
router.get('/search', searchCinemas);
router.get('/:movie_id/:region_id', findCinemaByMovieIdAndRegionId);

module.exports = router;
