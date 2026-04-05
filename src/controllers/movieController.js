const {
  createGenre,
  createMovie,
  batchCreateGenreMovies,
  fetchMovies,
  fetchGenres,
  updateMovieRuntime,
  updateMovieById,
  deleteMovieById,
  getMoviesFromRegion,
} = require('../models/moviesModel');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

const createNewGenre = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new AppError('VALIDATION_ERROR', 'Genre name is required.', 400);
  }

  const genre = await createGenre(name);
  ApiResponse.success(res, { data: genre, message: 'Genre created successfully', statusCode: 201 });
};

const createNewMovie = async (req, res) => {
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
    throw new AppError(
      'VALIDATION_ERROR',
      'All fields are required: title, rating, language, adult, release_date, poster_image_url, backdrop_image_url.',
      400
    );
  }

  if (source === 'tmdb' && !tmdb_id) {
    throw new AppError('VALIDATION_ERROR', "tmdb_id is required when source is 'tmdb'.", 400);
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
    await batchCreateGenreMovies(genre_ids, movie.id);
  }

  ApiResponse.success(res, { data: movie, message: 'Movie created successfully', statusCode: 201 });
};

const getMoviesByRegion = async (req, res) => {
  const result = await getMoviesFromRegion(req.params.id);
  ApiResponse.success(res, { data: result });
};

const getMovieById = async (req, res) => {
  const queryText = `
      SELECT movies.id, movies.source, movies.tmdb_id, movies.title, movies.poster_image_url,
             movies.backdrop_image_url, movies.rating, movies.overview, movies.runtime,
             movies.adult, movies.language, movies.release_date,
             STRING_AGG(genres.name, ', ') AS genres,
             COALESCE(ARRAY_AGG(genre_movies.genre_id) FILTER (WHERE genre_movies.genre_id IS NOT NULL), '{}') AS genre_ids
      FROM movies
      LEFT JOIN genre_movies ON movies.id = genre_movies.movie_id
      LEFT JOIN genres ON genre_movies.genre_id = genres.id
      WHERE movies.id = $1
      GROUP BY movies.id, movies.source, movies.tmdb_id, movies.title, movies.poster_image_url,
               movies.backdrop_image_url, movies.rating, movies.overview, movies.runtime,
               movies.adult, movies.language, movies.release_date;
      `;
  const result = await pool.query(queryText, [req.params.id]);
  if (!result.rows[0]) {
    throw new AppError('NOT_FOUND', 'Movie not found', 404);
  }
  ApiResponse.success(res, { data: result.rows[0] });
};

const getGenres = async (req, res) => {
  const genres = await fetchGenres();
  ApiResponse.success(res, { data: genres });
};

const getMovies = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || null;
  const { total_pages, current_page, total_movies, data } = await fetchMovies(search, page);
  ApiResponse.success(res, {
    data,
    pagination: {
      page: current_page,
      pageSize: 20,
      totalPages: total_pages,
      totalItems: total_movies,
    },
  });
};

const updateMovie = async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) {
    throw new AppError('VALIDATION_ERROR', 'Invalid movie id.', 400);
  }

  const {
    title,
    rating,
    language,
    adult,
    runtime,
    release_date,
    poster_image_url,
    backdrop_image_url,
    overview,
    genre_ids,
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
    throw new AppError(
      'VALIDATION_ERROR',
      'All fields are required: title, rating, language, adult, release_date, poster_image_url, backdrop_image_url.',
      400
    );
  }

  const updated = await updateMovieById(id, {
    title,
    rating,
    language,
    adult,
    runtime,
    release_date,
    poster_image_url,
    backdrop_image_url,
    overview,
    genre_ids,
  });

  ApiResponse.success(res, { data: updated, message: 'Movie updated successfully' });
};

const deleteMovie = async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) {
    throw new AppError('VALIDATION_ERROR', 'Invalid movie id.', 400);
  }

  await deleteMovieById(id);
  ApiResponse.success(res, { data: null, message: 'Movie deleted successfully' });
};

const fetchAndUpdateMovieRuntime = async (tmdb_id) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdb_id)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
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
  updateMovie,
  deleteMovie,
  fetchAndUpdateMovieRuntime,
};
