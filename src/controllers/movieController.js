const {
  createGenre,
  createMovie,
  createGenreMovie,
  fetchMovies,
  fetchGenres,
  updateMovieRuntime,
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
          SELECT movies.id, movies.title, movies.poster_image_url, movies.backdrop_image_url, movies.rating, movies.overview, movies.adult, STRING_AGG(genres.name, ', ') AS genres
          FROM movies
          JOIN genre_movies ON movies.id = genre_movies.movie_id
          JOIN genres ON genre_movies.genre_id = genres.id
          JOIN shows ON movies.id = shows.movie_id
          JOIN screens ON shows.screen_id = screens.id
          JOIN cinemas ON screens.cinema_id = cinemas.id
          JOIN regions ON cinemas.region_id = regions.id
          WHERE regions.id = $1
		  GROUP BY movies.id, movies.title, movies.poster_image_url, movies.backdrop_image_url, movies.rating, movies.overview, movies.adult;
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
        SELECT movies.title, movies.poster_image_url, movies.backdrop_image_url, movies.rating, movies.overview, movies.runtime, movies.adult, STRING_AGG(genres.name, ', ') AS genres
        FROM movies
        JOIN genre_movies ON movies.id = genre_movies.movie_id
        JOIN genres ON genre_movies.genre_id = genres.id
        WHERE movies.id = $1
		  GROUP BY movies.id, movies.title, movies.poster_image_url, movies.backdrop_image_url, movies.rating, movies.overview, movies.runtime, movies.adult;
        `;
    const result = await pool.query(queryText, [req.params.id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGenres = async (req, res) => {
  try {
    const genres = await fetchGenres();
    res.status(200).json(genres);
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

const fetchAndUpdateMovieRuntime = async (tmdb_id) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdb_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch from TMDB: ${response.status}`);
    }
    const data = await response.json();
    await updateMovieRuntime(data?.id, data?.runtime);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createNewGenre,
  createNewMovie,
  getMoviesByRegion,
  getMovieById,
  getGenres,
  getMovies,
  fetchAndUpdateMovieRuntime,
};
