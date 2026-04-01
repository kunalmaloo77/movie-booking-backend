const db = require('../config/db');

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

const createSeatCategory = async (name, description) => {
  const queryText = `
    INSERT INTO seat_categories (name, description)
    VALUES ($1, $2)
    RETURNING id, name, description;
  `;
  const values = [name, description];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const createSeat = async (row_label, column_label, screen_id, category_id) => {
  const queryText = `
      INSERT INTO seats (row_label, column_label, screen_id, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, row_label, column_label, screen_id, category_id;
    `;
  const values = [row_label, column_label, screen_id, category_id];
  const result = await db.query(queryText, values);
  return result.rows[0];
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
    JOIN show_seats ss ON s.id = ss.seat_id AND ss.show_id = $1
    ORDER BY s.row_label, s.column_label;
  `;
  const result = await db.query(queryText, [show_id]);
  return result.rows;
};

const getSeatCategoriesByScreenId = async (screen_id) => {
  const queryText = `
    SELECT DISTINCT sc.id, sc.name, sc.description FROM seats s 
    JOIN seat_categories sc ON s.category_id = sc.id 
    WHERE s.screen_id = $1 ORDER BY sc.id`;
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

const getSeatCategories = async () => {
  const queryText = `
    SELECT id, name, description FROM seat_categories ORDER BY id`;
  const result = await db.query(queryText);
  return result.rows;
};

module.exports = {
  createSeatCategoriesTable,
  createSeatsTable,
  createSeatCategory,
  createSeat,
  findSeatCategoriesByScreen,
  findSeatsByScreenId,
  findSeatsByShowId,
  getSeatCategoriesByScreenId,
  getSeatCategories,
};
