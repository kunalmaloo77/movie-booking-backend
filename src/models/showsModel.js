const db = require('../config/db');

const createShowsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS shows (
        id SERIAL PRIMARY KEY,
        movie_id INT NOT NULL REFERENCES movies(id),
        screen_id INT NOT NULL REFERENCES screens(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        language VARCHAR(50) NOT NULL DEFAULT 'English',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Shows table created successfully');
  } catch (error) {
    console.error('Error creating shows table:', error);
  }
};

const createShow = async (
  client,
  movie_id,
  screen_id,
  start_time,
  language = 'English'
) => {
  const queryText = `
    INSERT INTO shows (movie_id, screen_id, start_time, language)
    VALUES ($1, $2, $3, $4)
    RETURNING id, movie_id, screen_id, start_time, language, created_at;
  `;
  const values = [movie_id, screen_id, start_time, language];
  const result = await client.query(queryText, values);
  return result.rows[0];
};

const findShowsByScreenId = async (screen_id) => {
  const queryText =
    'SELECT * FROM shows WHERE screen_id = $1 ORDER BY start_time';
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

const findShowsByMovieId = async (movie_id) => {
  const queryText =
    'SELECT * FROM shows WHERE movie_id = $1 ORDER BY start_time';
  const result = await db.query(queryText, [movie_id]);
  return result.rows;
};

// Returns any existing show on the same screen whose runtime window overlaps
// with [start_time, start_time + runtime_minutes).
const findOverlappingShows = async (
  client,
  screen_id,
  start_time,
  runtime_minutes
) => {
  const queryText = `
    SELECT s.id, s.start_time, m.title, m.runtime
    FROM shows s
    JOIN movies m ON s.movie_id = m.id
    WHERE s.screen_id = $1
      AND s.status != 'cancelled'
      AND (
        s.start_time < ($2::timestamptz + ($3 || ' minutes')::interval)
        AND (s.start_time + (m.runtime || ' minutes')::interval) > $2::timestamptz
      )
    LIMIT 1;
  `;
  const result = await client.query(queryText, [
    screen_id,
    start_time,
    runtime_minutes,
  ]);
  return result.rows;
};

const createShowSeatsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS show_seats (
        id SERIAL PRIMARY KEY,
        show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        price DECIMAL(10, 2) NOT NULL,
        reserved_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (show_id, seat_id)
    );
    `;
  try {
    await db.query(queryText);
    console.log('Show seats table created successfully');
  } catch (error) {
    console.error('Error creating show seats table:', error);
  }
};

const createShowSeat = async (show_id, seat_id, price) => {
  const queryText = `
    INSERT INTO show_seats (show_id, seat_id, price)
    VALUES ($1, $2, $3)
    RETURNING id, show_id, seat_id, price;
  `;
  const values = [show_id, seat_id, price];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findShowSeatIds = async (show_id, seat_ids) => {
  const queryText = `
    SELECT id FROM show_seats WHERE show_id = $1 AND seat_id = ANY($2);
  `;
  const result = await db.query(queryText, [show_id, seat_ids]);
  return result.rows.map((row) => row.id);
};

const batchCreateShowSeats = async (client, show_id, seatPriceRows) => {
  if (seatPriceRows.length === 0) return [];
  const values = [];
  const placeholders = seatPriceRows.map((row, i) => {
    const base = i * 3;
    values.push(show_id, row.seat_id, row.price);
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });
  const queryText = `
    INSERT INTO show_seats (show_id, seat_id, price)
    VALUES ${placeholders.join(', ')}
    RETURNING id, show_id, seat_id, price;
  `;
  const result = await client.query(queryText, values);
  return result.rows;
};

module.exports = {
  createShowsTable,
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
  findOverlappingShows,
  createShowSeatsTable,
  createShowSeat,
  batchCreateShowSeats,
  findShowSeatIds,
};
