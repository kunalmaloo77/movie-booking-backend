const express = require("express");
const {
  createCinema,
  findCinemaByMovieIdAndRegionId,
  findCinemaByRegionId,
} = require("../controllers/cinemaController.js");
const { adminVerification } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", adminVerification, createCinema);
router.get("/:region_id", findCinemaByRegionId);
router.get("/:movie_id/:region_id", findCinemaByMovieIdAndRegionId);

module.exports = router;
