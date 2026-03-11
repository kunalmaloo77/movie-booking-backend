const db = require('../config/db');

const createScreensTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS screens (
        id SERIAL PRIMARY KEY,
        cinema_id INT NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        screen_type VARCHAR(50) NOT NULL,
        total_capacity INT NOT NULL,
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

const createScreen = async (cinema_id, name, screen_type, total_capacity) => {
  const queryText = `
    INSERT INTO screens (cinema_id, name, screen_type, total_capacity)
    VALUES ($1, $2, $3, $4)
    RETURNING id, cinema_id, name, screen_type, total_capacity, created_at;
  `;
  const values = [cinema_id, name, screen_type, total_capacity];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findScreensByCinemaId = async (cinema_id) => {
  const queryText = 'SELECT * FROM screens WHERE cinema_id = $1 ORDER BY name';
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
