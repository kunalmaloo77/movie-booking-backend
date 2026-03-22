const { createSeat } = require('../models/showsModel.js');

const insertSeatsBatch = async (seats_array) => {
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
  return createdSeats;
};

module.exports = {
  insertSeatsBatch,
};
