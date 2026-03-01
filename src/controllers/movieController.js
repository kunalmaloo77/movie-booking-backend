const {
  createGenre,
  createMovie,
  createGenreMovie,
  fetchMovies,
} = require('../models/moviesModel');
const { pool } = require('../config/db');

const createNewGenre = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Genre name is required.' });
    }

    const genre = await createGenre(name);
    res.status(201).json({ message: 'Genre created successfully', genre });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNewMovie = async (req, res) => {
  try {
    const {
      title,
      source = 'manual',
      tmdb_id,
      rating,
      language,
      adult,
      runtime,
      release_date,
      poster_image_url,
      backdrop_image_url,
      genre_ids,
      overview,
    } = req.body;

    if (
      !title ||
      !rating ||
      !language ||
      adult === undefined ||
      adult === null ||
      !release_date ||
      !poster_image_url ||
      !backdrop_image_url
    ) {
      return res.status(400).json({
        message:
          'All fields are required: title, rating, language, adult, release_date, poster_image_url, backdrop_image_url.',
      });
    }

    if (source === 'tmdb' && !tmdb_id) {
      return res.status(400).json({
        message: "tmdb_id is required when source is 'tmdb'.",
      });
    }

    const movie = await createMovie(
      title,
      source,
      source === 'tmdb' ? tmdb_id : null,
      rating,
      language,
      adult,
      runtime,
      release_date,
      poster_image_url,
      backdrop_image_url,
      overview
    );

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
          SELECT movies.id, movies.title, movies.poster_image_url, movies.rating, STRING_AGG(genres.name, ', ') AS genres
          FROM movies
          JOIN genre_movies ON movies.id = genre_movies.movie_id
          JOIN genres ON genre_movies.genre_id = genres.id
          JOIN shows ON movies.id = shows.movie_id
          JOIN screens ON shows.screen_id = screens.id
          JOIN cinemas ON screens.cinema_id = cinemas.id
          JOIN regions ON cinemas.region_id = regions.id
          WHERE regions.id = $1
		  GROUP BY movies.id, movies.title, movies.poster_image_url, movies.rating;
        `;
    const result = await pool.query(queryText, [req.params.id]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMovieById = async (req, res) => {
  try {
    const queryText = `
          SELECT movies.title, movies.poster_image_url, movies.rating, STRING_AGG(genres.name, ', ') AS genres
          FROM movies
          JOIN genre_movies ON movies.id = genre_movies.movie_id
          JOIN genres ON genre_movies.genre_id = genres.id
          WHERE movies.id = $1
		  GROUP BY movies.id, movies.title, movies.poster_image_url, movies.rating;
        `;
    const result = await pool.query(queryText, [req.params.id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGenres = async (req, res) => {
  try {
    const queryText = `SELECT id, name FROM genres;`;
    const result = await pool.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || null;
    const { total_pages, current_page, total_movies, data } = await fetchMovies(
      search,
      page
    );
    res.status(200).json({
      total_pages,
      current_page,
      total_movies,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTMDBMovieDetails = async (req, res) => {
  try {
    const { tmdb_id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdb_id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ message: 'Failed to fetch from TMDB' });
    }
    const data = await response.json();
    res.status(200).json({ runtime: data.runtime });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNewGenre,
  createNewMovie,
  getMoviesByRegion,
  getMovieById,
  getGenres,
  getMovies,
  getTMDBMovieDetails,
};
