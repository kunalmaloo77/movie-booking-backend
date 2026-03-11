const db = require('../config/db.js');

const createBookingTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      show_id INTEGER REFERENCES shows(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(queryText);
};

const createBookingSeatsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS booking_seats (
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      seat_id INTEGER REFERENCES seats(id),
      PRIMARY KEY (booking_id, seat_id)
    );
  `;
  await db.query(queryText);
};

const createBooking = async (user_id, show_id, seat_ids) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertBookingText = `
      INSERT INTO bookings (user_id, show_id) 
      VALUES ($1, $2)
      RETURNING id;
    `;
    const res = await client.query(insertBookingText, [user_id, show_id]);
    const bookingId = res.rows[0].id;
    const insertBookingSeatsText = `
      INSERT INTO booking_seats (booking_id, seat_id) 
      VALUES ($1, $2);
    `;
    for (const seat_id of seat_ids) {
      await client.query(insertBookingSeatsText, [bookingId, seat_id]);
    }
    await client.query('COMMIT');
    return bookingId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const fetchBookingsByUserId = async (user_id) => {
  try {
    const queryText = `
      SELECT b.id AS booking_id, b.show_id, b.created_at, 
             json_agg(s.column_label) AS seats
      FROM bookings b
      JOIN booking_seats bs ON b.id = bs.booking_id
      JOIN seats s ON bs.seat_id = s.id
      WHERE b.user_id = $1
      GROUP BY b.id;
    `;
    const res = await db.query(queryText, [user_id]);
    return res.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createBookingTable,
  createBookingSeatsTable,
  createBooking,
  fetchBookingsByUserId,
};
