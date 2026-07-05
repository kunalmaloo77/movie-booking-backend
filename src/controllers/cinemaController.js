const {
  createCinema: createCinemaModel,
  getCinemaByRegionId,
  searchCinemas,
} = require('../models/cinemaModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');

const createCinema = async (req, res) => {
  const { cinema_name, address, city_code } = req.body;
  const cinema = await createCinemaModel(cinema_name, address, city_code);
  ApiResponse.success(res, { data: cinema, statusCode: 201 });
};

const findCinemaByRegionId = async (req, res) => {
  const { region_id } = req.params;
  const cinemas = await getCinemaByRegionId(region_id);
  ApiResponse.success(res, { data: cinemas });
};

/**
 * Searches resources using query filters.
 */
const getCinemas = async (req, res) => {
  let { q, region_id, movie_id, selectedDate } = req.query;

  const normalizedQ = q && q.trim().length >= 2 ? q.trim() : null;

  const data = {
    region_id: region_id ? parseInt(region_id) : null,
    movie_id: movie_id ? parseInt(movie_id) : null,
    selectedDate: selectedDate,
    q: normalizedQ,
  };

  const cinemas = await searchCinemas(data);
  ApiResponse.success(res, { data: cinemas });
};

module.exports = {
  createCinema,
  findCinemaByRegionId,
  getCinemas,
};
