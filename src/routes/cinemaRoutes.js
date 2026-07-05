const express = require('express');
const {
  createCinema,
  findCinemaByMovieIdAndRegionId,
  getCinemas,
} = require('../controllers/cinemaController.js');
const { adminVerification } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/', adminVerification, createCinema);
router.get('/', getCinemas);

module.exports = router;
