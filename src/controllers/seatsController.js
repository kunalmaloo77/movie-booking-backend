const {
  createSeatCategory,
  createSeat,
  findSeatsByScreenId,
  getSeatCategoriesByScreenId,
} = require('../models/showsModel.js');
const { insertSeatsBatch } = require('../utils/seatService.js');

const handleCreateSeatCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'name and description are required' });
  }
  try {
    const category = await createSeatCategory(name, description);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create seat category' });
  }
};

/**
 * Now this logic is handled in screenController when creating a screen, so that seat creation can be done in batch for better performance.
 * This is for potential future use if we want to create seats independently of screens.
 */
const handleCreateSeat = async (req, res) => {
  const seats_array = req.body;
  if (!seats_array || !Array.isArray(seats_array) || seats_array.length === 0) {
    return res.status(400).json({
      error: 'seats_array must be a non-empty array',
    });
  }
  try {
    const createdSeats = await insertSeatsBatch(seats_array);
    res.status(201).json(createdSeats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create seats' });
  }
};

const getSeatsByScreenId = async (req, res) => {
  try {
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

    res
      .status(200)
      .json({ data: layout, message: 'Seats fetched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
};

const handleGetSeatCategoriesByScreenId = async (req, res) => {
  try {
    const { screen_id } = req.params;
    const categories = await getSeatCategoriesByScreenId(screen_id);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seat categories' });
  }
};

module.exports = {
  handleCreateSeatCategory,
  handleCreateSeat,
  getSeatsByScreenId,
  handleGetSeatCategoriesByScreenId,
};
