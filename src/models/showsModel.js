const db = require('../config/db');

const createShowsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS shows (
        id SERIAL PRIMARY KEY,
        movie_id INT NOT NULL REFERENCES movies(id),
        screen_id INT NOT NULL REFERENCES screens(id),
        show_date DATE NOT NULL,
        show_time TIME NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
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

const createShow = async (movie_id, screen_id, show_date, show_time, price) => {
  const queryText = `
    INSERT INTO shows (movie_id, screen_id, show_date, show_time, price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, movie_id, screen_id, show_date, show_time, price, created_at;
  `;
  const values = [movie_id, screen_id, show_date, show_time, price];
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

module.exports = {
  createShowsTable,
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
};
