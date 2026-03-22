const db = require('../config/db');

const createScreensTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS screens (
        id SERIAL PRIMARY KEY,
        cinema_id INT NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        screen_type INT NOT NULL REFERENCES screen_types(id),
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

const createScreensTypeTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS screen_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Screens types table created successfully');
  } catch (error) {
    console.error('Error creating screen types table', error);
  }
};

const createScreenType = async (name, description) => {
  const queryText = `
    INSERT INTO screen_types (name, description)
    VALUES ($1, $2)
    RETURNING id, name, description, created_at;
  `;
  const values = [name, description];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findScreenTypes = async () => {
  const queryText = 'SELECT * FROM screen_types ORDER BY name';
  const result = await db.query(queryText);
  return result.rows;
};

const createScreen = async (
  cinema_id,
  name,
  screen_type_id,
  total_capacity
) => {
  const queryText = `
    INSERT INTO screens (cinema_id, name, screen_type, total_capacity)
    VALUES ($1, $2, $3, $4)
    RETURNING id, cinema_id, name, screen_type, total_capacity, created_at;
  `;
  const values = [cinema_id, name, screen_type_id, total_capacity];
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

const deleteScreenById = async (id) => {
  await db.query('DELETE FROM screens WHERE id = $1', [id]);
};

const findSeatCategoriesByScreen = async (screen_id) => {
  const queryText = `
    SELECT sc.id, sc.name, sc.description
    FROM seat_categories sc
    JOIN seats s ON sc.id = s.category_id
    WHERE s.screen_id = $1
    GROUP BY sc.id, sc.name, sc.description
    ORDER BY sc.name;
  `;
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

module.exports = {
  createScreensTable,
  createScreen,
  deleteScreenById,
  findScreensByCinemaId,
  findScreenById,
  findSeatCategoriesByScreen,
  createScreensTypeTable,
  createScreenType,
  findScreenTypes,
};
