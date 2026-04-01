const {
  createRegion,
  findAllRegions,
  findRegionByCityName,
} = require('../models/regionModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');

const createRegionController = async (req, res) => {
  const { city_code, city_name } = req.body;
  if (!city_code || !city_name) {
    throw new AppError(
      'VALIDATION_ERROR',
      'City code and city name are required',
      400
    );
  }
  const region = await createRegion(city_code, city_name);
  ApiResponse.success(res, { data: region, statusCode: 201 });
};

const findRegionByCityNameController = async (req, res) => {
  const { city_name } = req.params;
  if (!city_name) {
    throw new AppError('VALIDATION_ERROR', 'City name is required', 400);
  }
  const region = await findRegionByCityName(city_name);
  ApiResponse.success(res, { data: region });
};

const findAllRegionsController = async (req, res) => {
  const search = req.query.search || null;
  const page = Number.parseInt(req.query.page, 10) || 1;
  const { total_pages, current_page, total_regions, data } =
    await findAllRegions(search, page);
  ApiResponse.success(res, {
    data,
    pagination: {
      page: current_page,
      pageSize: 20,
      totalPages: total_pages,
      totalItems: total_regions,
    },
  });
};

module.exports = {
  createRegionController,
  findRegionByCityNameController,
  findAllRegionsController,
};
