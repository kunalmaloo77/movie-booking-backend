const {
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
} = require("../models/showsModel.js");

const createNewShow = async (req, res) => {
  const { movie_id, screen_id, show_date, show_time, price } = req.body;

  if (!movie_id || !screen_id || !show_date || !show_time || !price) {
    return res.status(400).json({
      message: "All fields are required: movie_id, screen_id, show_date, show_time, price.",
    });
  }

  try {
    const show = await createShow(
      movie_id,
      screen_id,
      show_date,
      show_time,
      price,
    );
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShowsByScreenId = async (req, res) => {
  try {
    const { screen_id } = req.params;
    const shows = await findShowsByScreenId(screen_id);
    res.status(200).json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShowsByMovieId = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const shows = await findShowsByMovieId(movie_id);
    res.status(200).json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createNewShow, getShowsByScreenId, getShowsByMovieId };
