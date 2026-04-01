const {
  createCinema: createCinemaModel,
  findCinemaByRegionId: findCinemaByRegionIdModel,
  findCinemaByMovieIdAndRegionId: findCinemaByMovieIdAndRegionIdModel,
  searchCinemas: searchCinemasModel,
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
  const cinemas = await findCinemaByRegionIdModel(region_id);
  ApiResponse.success(res, { data: cinemas });
};

const findCinemaByMovieIdAndRegionId = async (req, res) => {
  const { region_id, movie_id } = req.params;
  const cinemas = await findCinemaByMovieIdAndRegionIdModel(region_id, movie_id);
  ApiResponse.success(res, { data: cinemas });
};

const searchCinemas = async (req, res) => {
  let { region_id, q } = req.query;

  if (q && typeof q !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Invalid q parameter', 400);
  }

  if (region_id && isNaN(parseInt(region_id))) {
    throw new AppError('VALIDATION_ERROR', 'Invalid region_id parameter', 400);
  }

  const normalizedQ = q && q.trim().length >= 2 ? q.trim() : null;

  if (!region_id && !normalizedQ) {
    return ApiResponse.success(res, { data: [] });
  }

  const cinemas = await searchCinemasModel(region_id, normalizedQ);
  ApiResponse.success(res, { data: cinemas });
};

module.exports = {
  createCinema,
  findCinemaByRegionId,
  findCinemaByMovieIdAndRegionId,
  searchCinemas,
};
