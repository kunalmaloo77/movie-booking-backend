const {
  createCinema: createCinemaModel,
  findCinemaByRegionId: findCinemaByRegionIdModel,
  findCinemaByMovieIdAndRegionId: findCinemaByMovieIdAndRegionIdModel,
} = require('../models/cinemaModel.js');

const createCinema = async (req, res) => {
  try {
    const { cinema_name, address, city_code } = req.body;
    const cinema = await createCinemaModel(cinema_name, address, city_code);
    res.status(201).json(cinema);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const findCinemaByRegionId = async (req, res) => {
  try {
    const { region_id } = req.params;
    const cinema = await findCinemaByRegionIdModel(region_id);
    res.status(200).json({ data: cinema });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const findCinemaByMovieIdAndRegionId = async (req, res) => {
  try {
    const { region_id, movie_id } = req.params;
    const cinema = await findCinemaByMovieIdAndRegionIdModel(
      region_id,
      movie_id
    );
    res.status(200).json(cinema);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCinema,
  findCinemaByRegionId,
  findCinemaByMovieIdAndRegionId,
};
