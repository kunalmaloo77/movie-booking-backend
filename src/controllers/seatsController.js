const {
  createSeatCategory,
  createSeat,
  findSeatsByScreenId,
} = require('../models/showsModel.js');

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

const handleCreateSeat = async (req, res) => {
  const seats_array = req.body;
  if (!seats_array || !Array.isArray(seats_array)) {
    return res.status(400).json({
      error: 'Invalid seats array provided',
    });
  }
  try {
    const createdSeats = [];
    for (const seatData of seats_array) {
      const { row_label, column_label, screen_id, category_id } = seatData;
      const seat = await createSeat(
        row_label,
        column_label,
        screen_id,
        category_id
      );
      createdSeats.push(seat);
    }
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

module.exports = {
  handleCreateSeatCategory,
  handleCreateSeat,
  getSeatsByScreenId,
};
