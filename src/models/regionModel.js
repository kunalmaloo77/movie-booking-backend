const db = require('../config/db');

const createRegionTable = async () => {
    const queryText = `
    CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      city_code VARCHAR(100) UNIQUE NOT NULL,
      city_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
    try {
        await db.query(queryText);
        console.log('Region table created successfully');
    } catch (error) {
        console.error('Error creating region table:', error);
    }
};

const createRegion = async (city_code, city_name) => {
    const queryText = `
    INSERT INTO regions (city_code, city_name)
    VALUES ($1, $2)
    RETURNING id, city_code, city_name, created_at;
  `;
    const values = [city_code, city_name];
    const result = await db.query(queryText, values);
    return result.rows[0];
};

const findRegionByCityCode = async (city_code) => {
    const queryText = 'SELECT * FROM regions WHERE city_code = $1';
    const result = await db.query(queryText, [city_code]);
    return result.rows[0];
};

module.exports = {
    createRegionTable,
    createRegion,
    findRegionByCityCode,
};
