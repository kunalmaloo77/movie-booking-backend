const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  createNewShow,
  getShowsByScreenId,
  getShowsByMovieId,
  getShowDetailsById,
  getLanguages
} = require('../controllers/showsController.js');

const router = express.Router();

router.post('/', adminVerification, createNewShow);
router.get('/languages', getLanguages);
router.get('/screen/:screen_id', getShowsByScreenId);
router.get('/:show_id/details', getShowDetailsById);
router.get('/movie/:movie_id', getShowsByMovieId);

module.exports = router;
