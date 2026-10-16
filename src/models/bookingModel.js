const db = require('../config/db.js');
const AppError = require('../utils/AppError.js');

const createBookingTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      show_id INTEGER NOT NULL REFERENCES shows(id),
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
      show_seats_id INTEGER REFERENCES show_seats(id),
      PRIMARY KEY (booking_id, show_seats_id)
    );
  `;
  await db.query(queryText);
};

const getReservationMinutes = () =>
  parseInt(process.env.RESERVATION_MINUTES, 10) || 5;

// Called by setInterval — releases seats whose reservation window has expired
const releaseExpiredReservations = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const reservationMinutes = getReservationMinutes();
    // here || means concatenate
    const expired = await client.query(
      `SELECT id FROM bookings
       WHERE status = 'CREATED'
         AND created_at < NOW() - ($1 || ' minutes')::interval
       FOR UPDATE SKIP LOCKED`,
      [reservationMinutes]
    );

    if (expired.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    const expiredIds = expired.rows.map((r) => r.id);

    // Release seats back to available.
    await client.query(
      `
      UPDATE show_seats ss
      SET status = 'available', reserved_until = NULL
      FROM booking_seats bs
      WHERE bs.show_seats_id = ss.id
        AND bs.booking_id = ANY($1::int[])
        AND ss.status = 'reserved'
        AND ss.reserved_until < NOW()
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

// Releases a just-created pending booking (e.g. Razorpay order creation failed).
// Safe: the reservation window is still active, so the seats belong to this booking.
const cancelPendingBooking = async (bookingId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, status FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (result.rows.length === 0 || result.rows[0].status !== 'CREATED') {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE show_seats ss
       SET status = 'available', reserved_until = NULL
       FROM booking_seats bs
       WHERE bs.show_seats_id = ss.id
         AND bs.booking_id = $1
         AND ss.status = 'reserved'`,
      [bookingId]
    );
    await client.query(`UPDATE bookings SET status = 'EXPIRED' WHERE id = $1`, [
      bookingId,
    ]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    // Non-fatal: the expiry sweeper will clean this booking up anyway
    console.error('Error cancelling pending booking:', error);
  } finally {
    client.release();
  }
};

// Reserves seats and inserts a pending booking, then creates the Razorpay order.
// The order is created OUTSIDE the transaction so a slow/hung payment-gateway
// call never holds row locks or a pool connection hostage.
const createBooking = async (
  user_id,
  show_id,
  show_seat_ids,
  razorpayInstance
) => {
  const reservationMinutes = getReservationMinutes();
  let bookingId;
  let totalAmount;
  let reservedUntil;

  // Phase 1: short transaction — lock seats, reserve, insert pending booking
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lock rows and check seats are available (not booked or reserved by someone else)
    // Currently, I am checking if the seat is available for all the seats that I get from the booking API.
    // I can't book just one seat and leave other seats remaining because one may have plans to watch a movie with the family, but he doesn't want to go alone. That's why.
    const availabilityCheck = await client.query(
      `SELECT id, seat_id, price FROM show_seats
       WHERE show_id = $1
         AND id = ANY($2::int[])
         AND ( status = 'available' OR (status = 'reserved' AND reserved_until < NOW()) )
       FOR UPDATE`,
      [show_id, show_seat_ids]
    );

    if (availabilityCheck.rows.length !== show_seat_ids.length) {
      await client.query('ROLLBACK');
      throw new AppError(
        'CONFLICT',
        'One or more seats are not available',
        409
      );
    }

    // Calculate total amount from seat prices
    totalAmount = availabilityCheck.rows.reduce(
      (sum, row) => sum + parseFloat(row.price),
      0
    );

    reservedUntil = new Date(Date.now() + reservationMinutes * 60 * 1000);

    // Reserve seats with expiry timestamp
    await client.query(
      `UPDATE show_seats
       SET status = 'reserved', reserved_until = $1
       WHERE show_id = $2 AND id = ANY($3::int[])`,
      [reservedUntil, show_id, show_seat_ids]
    );

    // Insert booking record (order id attached after the gateway call succeeds)
    const result = await client.query(
      `INSERT INTO bookings (user_id, show_id, status, amount)
       VALUES ($1, $2, 'CREATED', $3)
       RETURNING id`,
      [user_id, show_id, totalAmount]
    );
    bookingId = result.rows[0].id;

    // Link seats to booking
    const seatValues = show_seat_ids
      .map((_, i) => `($1, $${i + 2})`)
      .join(', ');

    await client.query(
      `INSERT INTO booking_seats (booking_id, show_seats_id) VALUES ${seatValues}`,
      [bookingId, ...show_seat_ids]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Phase 2: create Razorpay order (amount in paise) with no locks held
  let razorpayOrder;
  try {
    razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
    });

    await db.query(`UPDATE bookings SET razorpay_order_id = $1 WHERE id = $2`, [
      razorpayOrder.id,
      bookingId,
    ]);
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    await cancelPendingBooking(bookingId);
    throw new AppError(
      'PAYMENT_GATEWAY',
      'Failed to create payment order. Seats have been released.',
      502
    );
  }

  return {
    bookingId,
    razorpayOrderId: razorpayOrder.id,
    amount: totalAmount,
    currency: 'INR',
    reservedUntil,
  };
};

// Confirms booking after payment — idempotent
const confirmBooking = async (razorpayOrderId, razorpayPaymentId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT id, status,
              (created_at < NOW() - ($2 || ' minutes')::interval) AS is_expired
       FROM bookings WHERE razorpay_order_id = $1 FOR UPDATE`,
      [razorpayOrderId, getReservationMinutes()]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError('NOT_FOUND', 'Booking not found', 404);
    }

    const booking = bookingResult.rows[0];

    // Idempotent — already confirmed, nothing to do
    if (booking.status === 'PAYMENT_SUCCESS') {
      await client.query('COMMIT');
      return booking.id;
    }

    // Reject payments landing after the reservation window — the seats may
    // have been re-reserved or booked by someone else in the meantime.
    // The sweeper will mark the booking EXPIRED and release its seats.
    if (booking.status === 'EXPIRED' || booking.is_expired) {
      await client.query('ROLLBACK');
      throw new AppError('GONE', 'Booking reservation has expired', 410);
    }

    if (booking.status === 'PAYMENT_FAILED') {
      await client.query('ROLLBACK');
      throw new AppError(
        'CONFLICT',
        'Payment has already failed for this booking',
        409
      );
    }

    // Mark seats as booked and clear reservation window
    await client.query(
      `UPDATE show_seats ss
       SET status = 'booked', reserved_until = NULL
       FROM booking_seats bs
       WHERE bs.show_seats_id = ss.id AND bs.booking_id = $1`,
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

// Marks a booking as PAYMENT_FAILED and releases reserved seats back to available
const failBooking = async (razorpayOrderId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT id, status,
              (created_at < NOW() - ($2 || ' minutes')::interval) AS is_expired
       FROM bookings WHERE razorpay_order_id = $1 FOR UPDATE`,
      [razorpayOrderId, getReservationMinutes()]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const booking = bookingResult.rows[0];

    // Only act on CREATED bookings — don't clobber a successfully confirmed one
    if (booking.status !== 'CREATED') {
      await client.query('ROLLBACK');
      return;
    }

    // Release seats back to available. If the reservation window has already
    // lapsed, only release seats still carrying an expired window — a future
    // reserved_until means another user re-reserved them.
    await client.query(
      `UPDATE show_seats ss
       SET status = 'available', reserved_until = NULL
       FROM booking_seats bs
       WHERE bs.show_seats_id = ss.id
         AND bs.booking_id = $1
         AND ss.status = 'reserved'
         AND ($2::boolean = false OR ss.reserved_until < NOW())`,
      [booking.id, booking.is_expired]
    );

    await client.query(
      `UPDATE bookings SET status = 'PAYMENT_FAILED' WHERE id = $1`,
      [booking.id]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const fetchBookingsByUserId = async (user_id) => {
  const queryText = `
    SELECT
      b.id                        AS booking_id,
      b.show_id,
      b.status,
      b.amount,
      b.created_at,
      b.razorpay_order_id,
      b.razorpay_payment_id,
      m.title                     AS movie_title,
      c.cinema_name               AS cinema_name,
      scr.name                    AS screen_name,
      st.name                     AS screen_type,
      sh.start_time               AS show_time,
      lang.name                   AS language,
      json_agg(
        json_build_object(
          'row',      s.row_label,
          'col',      s.column_label,
          'category', sc.name
        )
        ORDER BY s.row_label, s.column_label
      ) AS seats
    FROM bookings b
    JOIN shows          sh  ON b.show_id        = sh.id
    JOIN languages      lang ON sh.language_id  = lang.id
    JOIN movies         m   ON sh.movie_id      = m.id
    JOIN screens        scr ON sh.screen_id     = scr.id
    JOIN screen_types   st  ON scr.screen_type  = st.id
    JOIN cinemas        c   ON scr.cinema_id    = c.id
    JOIN booking_seats  bs  ON b.id             = bs.booking_id
    JOIN show_seats     ss  ON bs.show_seats_id = ss.id
    JOIN seats          s   ON ss.seat_id       = s.id
    JOIN seat_categories sc ON s.category_id    = sc.id
    WHERE b.user_id = $1
    GROUP BY b.id, m.title, c.cinema_name, scr.name, st.name, sh.start_time, lang.name
    ORDER BY b.created_at DESC;
  `;
  const res = await db.query(queryText, [user_id]);
  return res.rows;
};

const fetchAdminRevenue = async () => {
  const queryText = `
    select
      regions.city_name,
      sum(bookings.amount) as total_revenue,
      count(bookings) as number_of_tickets
      from bookings
      join shows on bookings.show_id = shows.id
      join screens on shows.screen_id = screens.id
      join cinemas on screens.cinema_id = cinemas.id
      join regions on regions.id = cinemas.region_id
      where bookings.status = 'PAYMENT_SUCCESS'
      group by (regions.id);
  `;
  const res = await db.query(queryText);
  return res.rows;
};

const fetchTopBookedMovies = async () => {
  const queryText = `
    select
      movies.id,
      movies.title,
      count(bookings) as booking_count
      from bookings
      join shows on bookings.show_id = shows.id
      join movies on shows.movie_id = movies.id
      where bookings.status = 'PAYMENT_SUCCESS'
      group by movies.id
      order by booking_count desc
      limit 5;
  `;
  const res = await db.query(queryText);
  return res.rows;
};

const fetchDailyBookingStats = async (days) => {
  const queryText = `
    select
      date_trunc('day', bookings.created_at) as booking_date,
      count(bookings) as number_of_bookings,
      sum(bookings.amount) as total_amount
      from bookings
      where bookings.status = 'PAYMENT_SUCCESS'
        and bookings.created_at >= NOW() - ($1 || ' days')::interval
      group by date_trunc('day', bookings.created_at)
      order by booking_date asc;
  `;
  const res = await db.query(queryText, [days]);
  return res.rows;
};

module.exports = {
  createBookingTable,
  createBookingSeatsTable,
  createBooking,
  confirmBooking,
  failBooking,
  fetchBookingsByUserId,
  releaseExpiredReservations,
  fetchAdminRevenue,
  fetchTopBookedMovies,
  fetchDailyBookingStats,
};
