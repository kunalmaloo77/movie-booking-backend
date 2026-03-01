const db = require('../config/db');

const createScreensTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS screens (
        id SERIAL PRIMARY KEY,
        cinema_id INT NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
        screen_name VARCHAR(100) NOT NULL,
        number_of_seats INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Screens table created successfully');
  } catch (error) {
    console.error('Error creating screens table:', error);
  }
};

const createScreen = async (cinema_id, screen_name, number_of_seats) => {
  const queryText = `
    INSERT INTO screens (cinema_id, screen_name, number_of_seats)
    VALUES ($1, $2, $3)
    RETURNING id, cinema_id, screen_name, number_of_seats, created_at;
  `;
  const values = [cinema_id, screen_name, number_of_seats];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findScreensByCinemaId = async (cinema_id) => {
  const queryText =
    'SELECT * FROM screens WHERE cinema_id = $1 ORDER BY screen_name';
  const result = await db.query(queryText, [cinema_id]);
  return result.rows;
};

const findScreenById = async (id) => {
  const queryText = 'SELECT * FROM screens WHERE id = $1';
  const result = await db.query(queryText, [id]);
  return result.rows[0];
};

module.exports = {
  createScreensTable,
  createScreen,
  findScreensByCinemaId,
  findScreenById,
};
