const db = require('../config/db.js');

const insertSeatsBatch = async (seats_array) => {
  if (seats_array.length === 0) return [];
  const values = [];
  const placeholders = seats_array.map((seat, i) => {
    const base = i * 4;
    values.push(seat.row_label, seat.column_label, seat.screen_id, seat.category_id);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });
  const queryText = `
    INSERT INTO seats (row_label, column_label, screen_id, category_id)
    VALUES ${placeholders.join(', ')}
    RETURNING id, row_label, column_label, screen_id, category_id;
  `;
  const result = await db.query(queryText, values);
  return result.rows;
};

module.exports = {
  insertSeatsBatch,
};
