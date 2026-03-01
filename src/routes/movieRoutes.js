const express = require("express");
const { adminVerification } = require("../middleware/authMiddleware.js");
const {
  createNewGenre,
  createNewMovie,
  getMoviesByRegion,
  getMovieById,
  getGenres,
  getMovies,
  getTMDBMovieDetails,
} = require("../controllers/movieController.js");

const router = express.Router();

router.post("/", adminVerification, createNewMovie);
router.post("/genre/", adminVerification, createNewGenre);
router.get("/", getMovies);
router.get("/region/:id", getMoviesByRegion);
router.get("/genres", getGenres);
router.get("/tmdb/:tmdb_id", getTMDBMovieDetails);
router.get("/:id", getMovieById);

module.exports = router;
