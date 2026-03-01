const db = require("../config/db");
const crypto = require("crypto");

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
    console.log("Cinema table created successfully");
  } catch (error) {
    console.error("Error creating cinema table:", error);
  }
};

const createCinema = async (cinema_name, address, city_code) => {
  // Generate a random cinema code
  const maxRetries = 3;
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const cinema_code = crypto.randomBytes(4).toString("hex").toUpperCase();
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
      if (error.code === "23505" && attempts < maxRetries - 1) {
        attempts++;
        continue; // retry with new code
      }
      throw error;
    }
  }
};

const findCinemaByCinemaCode = async (cinema_code) => {
  const queryText = "SELECT * FROM cinemas WHERE cinema_code = $1";
  const result = await db.query(queryText, [cinema_code]);
  return result.rows[0];
};

const findCinemaByRegionId = async (region_id) => {
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
    console.error("Error finding cinema by region id:", error);
    return [];
  }
};

const findCinemaByMovieIdAndRegionId = async (region_id, movie_id) => {
  try {
    const queryText = `SELECT 
    cinemas.id,
    cinemas.cinema_name,
    cinemas.cinema_code,
    cinemas.address,
    shows.id,
    shows.show_time,
    shows.movie_id
    FROM cinemas 
    JOIN screens ON cinemas.id = screens.cinema_id
    JOIN shows ON screens.id = shows.screen_id 
    WHERE cinemas.region_id = $1 AND shows.movie_id = $2
    ORDER BY shows.show_time`;
    const result = await db.query(queryText, [region_id, movie_id]);
    return result.rows;
  } catch (error) {
    console.error("Error finding cinema by movie id and region id:", error);
    return [];
  }
};

module.exports = {
  createCinemaTable,
  createCinema,
  findCinemaByCinemaCode,
  findCinemaByRegionId,
  findCinemaByMovieIdAndRegionId,
};
