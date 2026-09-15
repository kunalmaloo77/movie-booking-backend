const {
  createRegion,
  findRegions,
  updateRegion,
  deleteRegion,
} = require('../models/regionModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');

const PAGE_LIMIT = 10;

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

const findRegionsController = async (req, res) => {
  const search = req.query.q || null;
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = req.query.limit;
  const { total_pages, current_page, total_regions, data } = await findRegions(
    search,
    page,
    limit
  );
  ApiResponse.success(res, {
    data,
    pagination: {
      page: current_page,
      pageSize: PAGE_LIMIT,
      totalPages: total_pages,
      totalItems: total_regions,
    },
  });
};

const updateRegionController = async (req, res) => {
  const { id } = req.params;
  const { new_city_code, new_city_name } = req.body;

  if (!id || !new_city_code || !new_city_name) {
    throw new AppError(
      'VALIDATION_ERROR',
      'new city name, new city code, and city id are required',
      400
    );
  }

  const region = await updateRegion(id, new_city_code, new_city_name);
  ApiResponse.success(res, { data: region });
};

const deleteRegionController = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new AppError('VALIDATION_ERROR', 'Id is required', 400);
  }

  await deleteRegion(id);
  ApiResponse.success(res, { message: 'Region deleted successfully' });
};

module.exports = {
  createRegionController,
  findRegionsController,
  updateRegionController,
  deleteRegionController,
};
