const db = require('../config/db');

const createGenereTable = async () => {
    const queryText = `
    CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        genre_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `
    try {
        await db.query(queryText);
        console.log('Genres table created successfully');
    } catch (error) {
        console.error('Error creating genres table:', error);
    }
}

const createGenreMovieTable = async () => {
    const queryText = `
    create table if not exists genre_movies (
        id serial primary key,
        genre_id int not null references genres(id),
        movie_id int not null references movies(id),
        created_at timestamp with time zone default current_timestamp
    );
    `
    try {
        await db.query(queryText);
        console.log('Genre movies table created successfully');
    } catch (error) {
        console.error('Error creating genre movies table:', error);
    }
}


const createMoviesTable = async () => {
    const queryText = `
    CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        movie_name VARCHAR(100) NOT NULL,
        rating DECIMAL(3,1) NOT NULL,
        language VARCHAR(100) NOT NULL,
        censor_rating VARCHAR(10) NOT NULL,
        duration_minutes INT NOT NULL,
        release_date DATE NOT NULL,
        poster_image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `
    try {
        await db.query(queryText);
        console.log('Movies table created successfully');
    } catch (error) {
        console.error('Error creating movies table:', error);
    }
};

const createMovie = async (movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url) => {
    const queryText = `
    INSERT INTO movies (movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url, created_at;
  `;
    const values = [movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url];
    const result = await db.query(queryText, values);
    return result.rows[0];
};

const createGenre = async (genre_name) => {
    const queryText = `
    INSERT INTO genres (genre_name)
    VALUES ($1)
    RETURNING id, genre_name, created_at;
  `;
    const values = [genre_name];
    const result = await db.query(queryText, values);
    return result.rows[0];
};

const createGenreMovie = async (genre_id, movie_id) => {
    const queryText = `
    INSERT INTO genre_movies (genre_id, movie_id)
    VALUES ($1, $2)
    RETURNING id, genre_id, movie_id, created_at;
  `;
    const values = [genre_id, movie_id];
    const result = await db.query(queryText, values);
    return result.rows[0];
};

const findMovieByMovieCode = async (movie_name) => {
    const queryText = 'SELECT * FROM movies WHERE movie_name = $1';
    const result = await db.query(queryText, [movie_name]);
    return result.rows[0];
};

module.exports = {
    createGenereTable,
    createGenreMovieTable,
    createMoviesTable,
    createMovie,
    findMovieByMovieCode,
    createGenre,
    createGenreMovie,
};