const {
  createCinema: createCinemaModel,
  findCinemaByRegionId: findCinemaByRegionIdModel,
  findCinemaByMovieIdAndRegionId: findCinemaByMovieIdAndRegionIdModel,
  searchCinemas: searchCinemasModel,
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

const searchCinemas = async (req, res) => {
  try {
    let { region_id, q } = req.query;

    // TODO: use validation library like Joi for this
    if (q && typeof q !== 'string') {
      return res.status(400).json({ message: 'Invalid q parameter' });
    }

    if (region_id && isNaN(parseInt(region_id))) {
      return res.status(400).json({ message: 'Invalid region_id parameter' });
    }

    const normalizedQ = q && q.trim().length >= 2 ? q.trim() : null;

    if (!region_id && !normalizedQ) {
      return res.status(200).json({ data: [] });
    }

    const cinemas = await searchCinemasModel(region_id, normalizedQ);

    res.status(200).json({ data: cinemas });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCinema,
  findCinemaByRegionId,
  findCinemaByMovieIdAndRegionId,
  searchCinemas,
};
