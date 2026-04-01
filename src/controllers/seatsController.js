const {
  createSeatCategory,
  getSeatCategories,
  findSeatsByScreenId,
  getSeatCategoriesByScreenId,
} = require('../models/seatModel.js');
const { insertSeatsBatch } = require('../utils/seatService.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');

const handleCreateSeatCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new AppError('VALIDATION_ERROR', 'name and description are required', 400);
  }
  const category = await createSeatCategory(name, description);
  ApiResponse.success(res, { data: category, statusCode: 201 });
};

/**
 * Now this logic is handled in screenController when creating a screen, so that seat creation can be done in batch for better performance.
 * This is for potential future use if we want to create seats independently of screens.
 */
const handleCreateSeat = async (req, res) => {
  const seats_array = req.body;
  if (!seats_array || !Array.isArray(seats_array) || seats_array.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'seats_array must be a non-empty array', 400);
  }
  const createdSeats = await insertSeatsBatch(seats_array);
  ApiResponse.success(res, { data: createdSeats, statusCode: 201 });
};

const getSeatsByScreenId = async (req, res) => {
  const { screen_id } = req.params;
  const seats = await findSeatsByScreenId(screen_id);
  const layout = [];
  seats.forEach((seat) => {
    const { id, row_label, column_label, category_id } = seat;
    let row = layout.find((r) => r.row === row_label);
    if (!row) {
      row = {
        row: row_label,
        seats: [],
      };
      layout.push(row);
    }
    row.seats.push({ id, column_label, category_id });
  });

  ApiResponse.success(res, { data: layout, message: 'Seats fetched successfully' });
};

const handleGetSeatCategoriesByScreenId = async (req, res) => {
  const { screen_id } = req.params;
  const categories = await getSeatCategoriesByScreenId(screen_id);
  ApiResponse.success(res, { data: categories });
};

const handleGetSeatCategories = async (req, res) => {
  const categories = await getSeatCategories();
  ApiResponse.success(res, { data: categories });
};

module.exports = {
  handleCreateSeatCategory,
  handleCreateSeat,
  getSeatsByScreenId,
  handleGetSeatCategoriesByScreenId,
  handleGetSeatCategories,
};
