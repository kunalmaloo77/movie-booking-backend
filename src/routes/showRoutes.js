const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  createNewShow,
  getShowsByScreenId,
  getShowsByMovieId,
  getSeatsByShowId,
} = require('../controllers/showsController.js');

const router = express.Router();

router.post('/', adminVerification, createNewShow);
router.get('/screen/:screen_id', getShowsByScreenId);
router.get('/movie/:movie_id', getShowsByMovieId);
router.get('/:show_id/seats', getSeatsByShowId);

module.exports = router;
