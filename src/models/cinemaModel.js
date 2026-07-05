const db = require('../config/db');
const crypto = require('crypto');

const createCinemaTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS cinemas (
        id SERIAL PRIMARY KEY,
        cinema_name VARCHAR(100) NOT NULL,
        cinema_code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        region_id INT NOT NULL REFERENCES regions(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Cinema table created successfully');
  } catch (error) {
    console.error('Error creating cinema table:', error);
  }
};

const createCinema = async (cinema_name, address, city_code) => {
  // Generate a random cinema code
  const maxRetries = 3;
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const cinema_code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const queryText = `
                INSERT INTO cinemas (cinema_name, cinema_code, address, region_id)
                SELECT $1, $2, $3, id
                FROM regions
                WHERE city_code = $4
                RETURNING id, cinema_name, cinema_code, address, region_id, created_at;
            `;
      const values = [cinema_name, cinema_code, address, city_code];
      const result = await db.query(queryText, values);
      if (result.rows.length === 0) {
        throw new Error(`Region with city code ${city_code} not found`);
      }
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505' && attempts < maxRetries - 1) {
        attempts++;
        continue; // retry with new code
      }
      throw error;
    }
  }
};

const findCinemaByCinemaCode = async (cinema_code) => {
  const queryText = 'SELECT * FROM cinemas WHERE cinema_code = $1';
  const result = await db.query(queryText, [cinema_code]);
  return result.rows[0];
};

const getCinemaByRegionId = async (region_id) => {
  try {
    const queryText = `SELECT 
    cinemas.id,
    cinemas.cinema_name,
    cinemas.cinema_code,
    cinemas.address,
    regions.city_code
    FROM cinemas JOIN regions ON cinemas.region_id = regions.id
    WHERE regions.id = $1`;
    const result = await db.query(queryText, [region_id]);
    return result.rows;
  } catch (error) {
    console.error('Error finding cinema by region id:', error);
    return [];
  }
};

const searchCinemas = async (data) => {
  const { region_id, movie_id, selectedDate, q } = data;
  let conditions = [];
  let values = [];
  let idx = 1;
  if (selectedDate) {
    conditions.push(`s.start_time::date = $${idx++} and s.start_time > NOW() `);
    values.push(selectedDate);
  }
  if (region_id) {
    conditions.push('r.id = $' + idx++);
    values.push(region_id);
  }
  if (movie_id) {
    conditions.push('s.movie_id = $' + idx++);
    values.push(movie_id);
  }
  if (q) {
    conditions.push('c.cinema_name ILIKE $' + idx++);
    values.push(`%${q}%`);
  }
  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const queryText = `
      SELECT DISTINCT 
      c.id as cinema_id,
      c.cinema_name,
      c.cinema_code,
      c.address,
      s.start_time,
      s.id as show_id
      FROM cinemas as c
      JOIN regions as r ON c.region_id = r.id
      JOIN screens as scr ON c.id = scr.cinema_id
      JOIN shows as s ON scr.id = s.screen_id
      ${whereClause}
      ORDER BY c.cinema_name
      LIMIT 10;
    `;
  const result = await db.query(queryText, values);
  return result.rows;
};

module.exports = {
  createCinemaTable,
  createCinema,
  findCinemaByCinemaCode,
  getCinemaByRegionId,
  searchCinemas,
};
