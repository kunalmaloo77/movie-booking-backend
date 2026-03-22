const db = require('../config/db.js');

const createBookingTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      show_id INTEGER REFERENCES shows(id),
      razorpay_order_id VARCHAR(255) UNIQUE,
      razorpay_payment_id VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
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

// Called by setInterval — releases seats whose reservation window has expired
const releaseExpiredReservations = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const expired = await client.query(`
      SELECT id FROM bookings
      WHERE status = 'CREATED'
        AND created_at < NOW() - INTERVAL '${process.env.RESERVATION_MINUTES || 5} minutes'
    `);

    if (expired.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    const expiredIds = expired.rows.map((r) => r.id);

    // Release seats back to available
    await client.query(
      `
      UPDATE show_seats ss
      SET status = 'available', reserved_until = NULL
      FROM booking_seats bs
      WHERE bs.seat_id = ss.seat_id
        AND bs.booking_id = ANY($1::int[])
    `,
      [expiredIds]
    );

    // Mark bookings as expired
    await client.query(
      `
      UPDATE bookings SET status = 'EXPIRED'
      WHERE id = ANY($1::int[])
    `,
      [expiredIds]
    );

    await client.query('COMMIT');
    console.log(`Released ${expiredIds.length} expired reservation(s)`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error releasing expired reservations:', error);
  } finally {
    client.release();
  }
};

// Creates a Razorpay order, reserves seats, and inserts a pending booking
const createBooking = async (user_id, show_id, seat_ids, razorpayInstance) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const reservationMinutes = process.env.RESERVATION_MINUTES || 10;

    // Lock rows and check seats are available (not booked or reserved by someone else)
    const availabilityCheck = await client.query(
      `SELECT ss.seat_id, ss.price FROM show_seats ss
       WHERE ss.show_id = $1
         AND ss.seat_id = ANY($2::int[])
         AND ss.status = 'available'
       FOR UPDATE`,
      [show_id, seat_ids]
    );

    if (availabilityCheck.rows.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      const err = new Error('One or more seats are not available');
      err.statusCode = 409;
      throw err;
    }

    // Calculate total amount from seat prices
    const totalAmount = availabilityCheck.rows.reduce(
      (sum, row) => sum + parseFloat(row.price),
      0
    );

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
    });

    const reservedUntil = new Date(Date.now() + reservationMinutes * 60 * 1000);

    // Reserve seats with expiry timestamp
    await client.query(
      `UPDATE show_seats
       SET status = 'reserved', reserved_until = $1
       WHERE show_id = $2 AND seat_id = ANY($3::int[])`,
      [reservedUntil, show_id, seat_ids]
    );

    // Insert booking record
    const result = await client.query(
      `INSERT INTO bookings (user_id, show_id, razorpay_order_id, status, amount)
       VALUES ($1, $2, $3, 'CREATED', $4)
       RETURNING id`,
      [user_id, show_id, razorpayOrder.id, totalAmount]
    );
    const bookingId = result.rows[0].id;

    // Link seats to booking
    const seatValues = seat_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
    await client.query(
      `INSERT INTO booking_seats (booking_id, seat_id) VALUES ${seatValues}`,
      [bookingId, ...seat_ids]
    );

    await client.query('COMMIT');

    return {
      bookingId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      reservedUntil,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Confirms booking after payment — idempotent
const confirmBooking = async (razorpayOrderId, razorpayPaymentId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT id, status FROM bookings WHERE razorpay_order_id = $1 FOR UPDATE`,
      [razorpayOrderId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    const booking = bookingResult.rows[0];

    // Idempotent — already confirmed, nothing to do
    if (booking.status === 'PAYMENT_SUCCESS') {
      await client.query('COMMIT');
      return booking.id;
    }

    if (booking.status === 'EXPIRED') {
      await client.query('ROLLBACK');
      const err = new Error('Booking reservation has expired');
      err.statusCode = 410;
      throw err;
    }

    // Mark seats as booked and clear reservation window
    await client.query(
      `UPDATE show_seats ss
       SET status = 'booked', reserved_until = NULL
       FROM booking_seats bs
       WHERE bs.seat_id = ss.seat_id AND bs.booking_id = $1`,
      [booking.id]
    );

    // Confirm booking
    await client.query(
      `UPDATE bookings
       SET status = 'PAYMENT_SUCCESS', razorpay_payment_id = $1
       WHERE id = $2`,
      [razorpayPaymentId, booking.id]
    );

    await client.query('COMMIT');
    return booking.id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const fetchBookingsByUserId = async (user_id) => {
  const queryText = `
    SELECT b.id AS booking_id, b.show_id, b.status, b.amount, b.created_at,
           json_agg(json_build_object('row', s.row_label, 'col', s.column_label)) AS seats
    FROM bookings b
    JOIN booking_seats bs ON b.id = bs.booking_id
    JOIN seats s ON bs.seat_id = s.id
    WHERE b.user_id = $1
    GROUP BY b.id
    ORDER BY b.created_at DESC;
  `;
  const res = await db.query(queryText, [user_id]);
  return res.rows;
};

module.exports = {
  createBookingTable,
  createBookingSeatsTable,
  createBooking,
  confirmBooking,
  fetchBookingsByUserId,
  releaseExpiredReservations,
};
