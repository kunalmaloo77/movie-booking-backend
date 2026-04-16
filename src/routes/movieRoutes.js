const express = require('express');
const { adminVerification } = require('../middleware/authMiddleware.js');
const {
  createNewGenre,
  createNewMovie,
  getMoviesByRegion,
  getMovieById,
  getGenres,
  getMovies,
  updateMovie,
  deleteMovie,
  getMoviesWithFilters,
  getMovieFilterOptions,
} = require('../controllers/movieController.js');

const router = express.Router();

router.post('/', adminVerification, createNewMovie);
router.post('/genre/', adminVerification, createNewGenre);
router.get('/', getMovies);
router.get('/region/:region_id/options', getMovieFilterOptions);
router.get('/region/:region_id/filtered', getMoviesWithFilters);
router.get('/region/:region_id', getMoviesByRegion);
router.get('/genres', getGenres);
router.get('/:id', getMovieById);
router.put('/:id', adminVerification, updateMovie);
router.delete('/:id', adminVerification, deleteMovie);

module.exports = router;
