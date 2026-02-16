const { createGenre, createMovie, createGenreMovie, findMovieByMovieCode } = require('../models/moviesModel');
const { pool } = require('../config/db');

const createNewGenre = async (req, res) => {
    try {
        const { genre_name } = req.body;

        if (!genre_name) {
            return res.status(400).json({ message: 'Genre name is required.' });
        }

        const genre = await createGenre(genre_name);
        res.status(201).json({ message: 'Genre created successfully', genre });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createNewMovie = async (req, res) => {
    try {
        const { movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url, genre_ids } = req.body;

        if (!movie_name || !rating || !language || !censor_rating || !duration_minutes || !release_date || !poster_image_url) {
            return res.status(400).json({ message: 'All fields are required: movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url.' });
        }

        const existingMovie = await findMovieByMovieCode(movie_name);
        if (existingMovie) {
            return res.status(400).json({ message: 'Movie with this name already exists.' });
        }

        const movie = await createMovie(movie_name, rating, language, censor_rating, duration_minutes, release_date, poster_image_url);

        if (genre_ids && genre_ids.length > 0) {
            for (const genre_id of genre_ids) {
                await createGenreMovie(genre_id, movie.id);
            }
        }

        res.status(201).json({ message: 'Movie created successfully', movie });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMoviesByRegion = async (req, res) => {
    try {
        const queryText = `
          SELECT movies.name, movies.poster_image_url, movies.rating, genres.genre_name
          FROM movies
          JOIN genre_movies ON movies.id = genre_movies.movie_id
          JOIN genres ON genre_movies.genre_id = genres.id
          JOIN shows ON movies.id = shows.movie_id
          JOIN theatres ON shows.theatre_id = theatres.id
          JOIN regions ON theatres.region_id = regions.id
          WHERE regions.id = $1;
        `
        const result = await pool.query(queryText, [req.params.id]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { createNewGenre, createNewMovie, getMoviesByRegion };
