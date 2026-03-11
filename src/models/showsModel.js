const db = require('../config/db');

const createShowsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS shows (
        id SERIAL PRIMARY KEY,
        movie_id INT NOT NULL REFERENCES movies(id),
        screen_id INT NOT NULL REFERENCES screens(id),
        show_date DATE NOT NULL,
        show_time TIME NOT NULL,
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
  movie_id,
  screen_id,
  show_date,
  show_time,
  language = 'English'
) => {
  const queryText = `
    INSERT INTO shows (movie_id, screen_id, show_date, show_time, language)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, movie_id, screen_id, show_date, show_time, language, created_at;
  `;
  const values = [movie_id, screen_id, show_date, show_time, language];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findShowsByScreenId = async (screen_id) => {
  const queryText =
    'SELECT * FROM shows WHERE screen_id = $1 ORDER BY show_date, show_time';
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

const findShowsByMovieId = async (movie_id) => {
  const queryText =
    'SELECT * FROM shows WHERE movie_id = $1 ORDER BY show_date, show_time';
  const result = await db.query(queryText, [movie_id]);
  return result.rows;
};

const createSeatCategoriesTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS seat_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL
    );
    `;
  try {
    await db.query(queryText);
    console.log('Seat categories table created successfully');
  } catch (error) {
    console.error('Error creating seat categories table:', error);
  }
};

const createSeatCategory = async (name, description) => {
  try {
    const queryText = `
      INSERT INTO seat_categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description;
    `;
    const values = [name, description];
    const result = await db.query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating seat category:', error);
    throw new Error('Failed to create seat category');
  }
};

const createSeatsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        row_label VARCHAR(5) NOT NULL,
        column_label INT NOT NULL,
        screen_id INT NOT NULL REFERENCES screens(id),
        category_id INT NOT NULL REFERENCES seat_categories(id),
        UNIQUE (row_label, column_label, screen_id)
    );
    `;
  try {
    await db.query(queryText);
    console.log('Seats table created successfully');
  } catch (error) {
    console.error('Error creating seats table:', error);
  }
};

const createSeat = async (row_label, column_label, screen_id, category_id) => {
  try {
    const queryText = `
      INSERT INTO seats (row_label, column_label, screen_id, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, row_label, column_label, screen_id, category_id;
    `;
    const values = [row_label, column_label, screen_id, category_id];
    const result = await db.query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating seat:', error);
    throw new Error('Failed to create seat');
  }
};

const findSeatsByScreenId = async (screen_id) => {
  const queryText = `
    SELECT s.id, s.row_label, s.column_label, s.category_id
    FROM seats s
    WHERE s.screen_id = $1
    ORDER BY s.row_label, s.column_label;
  `;
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

const findSeatsByShowId = async (show_id) => {
  const queryText = `
    SELECT s.id, s.row_label, s.column_label, s.category_id, ss.status, ss.price
    FROM seats s
    LEFT JOIN show_seats ss ON s.id = ss.seat_id AND ss.show_id = $1
    ORDER BY s.row_label, s.column_label;
  `;
  const result = await db.query(queryText, [show_id]);
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
  try {
    const queryText = `
      INSERT INTO show_seats (show_id, seat_id, price)
      VALUES ($1, $2, $3)
      RETURNING id, show_id, seat_id, price;
    `;
    const values = [show_id, seat_id, price];
    const result = await db.query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating show seat:', error);
    throw new Error('Failed to create show seat');
  }
};

module.exports = {
  createSeat,
  findSeatsByScreenId,
  findSeatsByShowId,
  createShowsTable,
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
  createSeatsTable,
  createSeatCategoriesTable,
  createShowSeatsTable,
  createSeatCategory,
  createShowSeat,
};
