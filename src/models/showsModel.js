const db = require('../config/db');

const createShowsTable = async () => {
    const queryText = `
    CREATE TABLE IF NOT EXISTS shows (
        id SERIAL PRIMARY KEY,
        movie_id INT NOT NULL REFERENCES movies(id),
        cinema_id INT NOT NULL REFERENCES cinemas(id),
        show_date DATE NOT NULL,
        show_start_time TIME NOT NULL,
        show_end_time TIME NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `
    try {
        await db.query(queryText);
        console.log('Shows table created successfully');
    } catch (error) {
        console.error('Error creating shows table:', error);
    }
};

const createShow = async (movie_id, cinema_id, show_date, show_start_time, show_end_time, price) => {
    const queryText = `
    INSERT INTO shows (movie_id, cinema_id, show_date, show_start_time, show_end_time, price)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, movie_id, cinema_id, show_date, show_start_time, show_end_time, price, created_at;
  `;
    const values = [movie_id, cinema_id, show_date, show_start_time, show_end_time, price];
    const result = await db.query(queryText, values);
    return result.rows[0];
};

const findShowByShowCode = async (show_code) => {
    const queryText = 'SELECT * FROM shows WHERE show_code = $1';
    const result = await db.query(queryText, [show_code]);
    return result.rows[0];
};

module.exports = {
    createShowsTable,
    createShow,
    findShowByShowCode,
};