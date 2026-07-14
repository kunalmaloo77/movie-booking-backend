const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  createNewShow,
  getShows,
  getShowsByScreenId,
  getShowsByMovieId,
  getShowDetailsById,
  getLanguages,
  updateExistingShow,
  deleteExistingShow,
} = require('../controllers/showsController.js');

const router = express.Router();

router.post('/', adminVerification, createNewShow);
router.get('/', adminVerification, getShows);
router.get('/languages', getLanguages);
router.get('/screen/:screen_id', getShowsByScreenId);
router.get('/:show_id/details', getShowDetailsById);
router.get('/movie/:movie_id', getShowsByMovieId);
router.put('/:id', adminVerification, updateExistingShow);
router.delete('/:id', adminVerification, deleteExistingShow);

module.exports = router;
