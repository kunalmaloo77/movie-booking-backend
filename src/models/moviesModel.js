const db = require('../config/db');
const PAGE_LIMIT = 20;

const createGenreTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Genres table created successfully');
  } catch (error) {
    console.error('Error creating genres table:', error);
  }
};

const createMoviesTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'tmdb')),
        tmdb_id INT UNIQUE,
        title VARCHAR(100) NOT NULL,
        rating DECIMAL(3,1) NOT NULL,
        language VARCHAR(100) NOT NULL,
        adult BOOLEAN NOT NULL,
        runtime INT,
        release_date DATE NOT NULL,
        poster_image_url VARCHAR(255) NOT NULL,
        backdrop_image_url VARCHAR(255) NOT NULL,
        overview TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Movies table created successfully');
  } catch (error) {
    console.error('Error creating movies table:', error);
  }
};

const getMoviesFromRegion = async (region_id) => {
  try {
    const queryText = `
    SELECT m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating, m.overview, m.adult, STRING_AGG(DISTINCT g.name, ', ') AS genres
          FROM movies m
          JOIN genre_movies gm ON m.id = gm.movie_id
          JOIN genres g ON gm.genre_id = g.id
          JOIN shows s ON m.id = s.movie_id AND s.start_time::date > CURRENT_DATE
          JOIN screens sc ON s.screen_id = sc.id
          JOIN cinemas c ON sc.cinema_id = c.id
          WHERE c.region_id = $1
		  GROUP BY m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating, m.overview, m.adult;`;
    const result = await db.query(queryText, [region_id]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching movies from region:', error);
    throw error;
  }
};

const createGenreMovieTable = async () => {
  const queryText = `
    create table if not exists genre_movies (
        id serial primary key,
        genre_id int not null references genres(id),
        movie_id int not null references movies(id),
        created_at timestamp with time zone default current_timestamp,
        UNIQUE (genre_id, movie_id)
    );
    `;
  try {
    await db.query(queryText);
    console.log('Genre movies table created successfully');
  } catch (error) {
    console.error('Error creating genre movies table:', error);
  }
};

const createMovie = async (
  title,
  source,
  tmdb_id = null,
  rating,
  language,
  adult,
  runtime,
  release_date,
  poster_image_url,
  backdrop_image_url,
  overview
) => {
  const queryText = `
    INSERT INTO movies (title, source, tmdb_id, rating, language, adult, runtime, release_date, poster_image_url, backdrop_image_url, overview)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, title, source, tmdb_id, rating, language, adult, runtime, release_date, poster_image_url, backdrop_image_url, overview, created_at;
  `;
  const values = [
    title,
    source,
    tmdb_id,
    rating,
    language,
    adult,
    runtime,
    release_date,
    poster_image_url,
    backdrop_image_url,
    overview,
  ];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const createGenre = async (name) => {
  const queryText = `
    INSERT INTO genres (name)
    VALUES ($1)
    RETURNING id, name, created_at;
  `;
  const values = [name];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const fetchGenres = async () => {
  try {
    const queryText = `SELECT id, name FROM genres ORDER BY name;`;
    const result = await db.query(queryText);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * @description Upsert genre generally used to add genres from TMDB API
 * @param {number} id - The id of the genre
 * @param {string} name - The name of the genre
 * @returns {Promise<Object>} The upserted genre
 * @example
 * const genre = await upsertGenre(1, 'Action');
 * console.log(genre);
 */

const upsertGenre = async (id, name) => {
  const queryText = `
    INSERT INTO genres (id, name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, created_at;
  `;
  const values = [id, name];
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

const batchCreateGenreMovies = async (genre_ids, movie_id) => {
  if (!genre_ids || genre_ids.length === 0) return;
  const values = [];
  const placeholders = genre_ids.map((genre_id, i) => {
    const base = i * 2;
    values.push(genre_id, movie_id);
    return `($${base + 1}, $${base + 2})`;
  });
  const queryText = `
    INSERT INTO genre_movies (genre_id, movie_id)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (genre_id, movie_id) DO NOTHING;
  `;
  await db.query(queryText, values);
};

const fetchMovies = async (search = null, page = 1) => {
  const offset = (page - 1) * PAGE_LIMIT;
  let whereClause = '';
  const values = [];

  if (search) {
    whereClause = `WHERE title ILIKE $1 OR tmdb_id = $2`;
    values.push(`%${search}%`, !isNaN(search) ? parseInt(search) : null);
  }

  let queryText = `
    SELECT id, title, source, tmdb_id, rating, language, adult, runtime,
           release_date, poster_image_url, backdrop_image_url, overview, created_at, COUNT(*) OVER() AS total_count
    FROM movies
    ${whereClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(PAGE_LIMIT, offset);

  const result = await db.query(queryText, values);
  const rows = result.rows;
  const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);
  const data = rows.map(({ total_count, ...movieData }) => movieData);

  return {
    total_pages: totalPages,
    current_page: page,
    total_movies: totalCount,
    data: data,
  };
};

/**
 * @param {*} movies
 * @returns Promise<void>
 *
 * Function to batch insert movies into the database.
 * Uses parameterized queries to prevent SQL injection and improve performance.
 */

const buildMovieValues = (movie) => [
  movie.title,
  'tmdb',
  movie.id,
  movie.vote_average,
  movie.original_language,
  movie.adult,
  movie.release_date,
  movie.poster_path,
  movie.backdrop_path,
  movie.overview,
];

const insertGenrePairs = async (client, pairs) => {
  if (!pairs.length) {
    return;
  }

  const genreValues = [];
  const genrePlaceholders = pairs.map(([movieId, genreId], index) => {
    const base = index * 2;
    genreValues.push(movieId, genreId);
    return `($${base + 1}, $${base + 2})`;
  });

  const genreQueryText = `
    INSERT INTO genre_movies (movie_id, genre_id)
    VALUES ${genrePlaceholders.join(', ')}
    ON CONFLICT DO NOTHING
  `;

  await client.query(genreQueryText, genreValues);
};

const insertMovieBatch = async (client, movies) => {
  const values = [];
  const placeholders = movies.map((movie, index) => {
    const base = index * 10;
    values.push(...buildMovieValues(movie));
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
  });

  const movieQueryText = `
    INSERT INTO movies (title, source, tmdb_id, rating, language, adult, release_date, poster_image_url, backdrop_image_url, overview)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (tmdb_id) DO UPDATE SET
      title = EXCLUDED.title,
      source = EXCLUDED.source,
      rating = EXCLUDED.rating,
      language = EXCLUDED.language,
      adult = EXCLUDED.adult,
      release_date = EXCLUDED.release_date,
      poster_image_url = EXCLUDED.poster_image_url,
      backdrop_image_url = EXCLUDED.backdrop_image_url,
      overview = EXCLUDED.overview
    RETURNING id, tmdb_id
  `;

  const movieResult = await client.query(movieQueryText, values);
  const tmdbIdToDbId = {};
  movieResult.rows.forEach((row) => {
    tmdbIdToDbId[row.tmdb_id] = row.id;
  });

  const genrePairs = [];
  movies.forEach((movie) => {
    const dbMovieId = tmdbIdToDbId[movie.id];
    if (!dbMovieId || !Array.isArray(movie.genre_ids)) {
      return;
    }

    movie.genre_ids.forEach((genreId) => {
      genrePairs.push([dbMovieId, genreId]);
    });
  });

  await insertGenrePairs(client, genrePairs);
};

const insertSingleMovie = async (client, movie) => {
  const movieQueryText = `
    INSERT INTO movies (title, source, tmdb_id, rating, language, adult, release_date, poster_image_url, backdrop_image_url, overview)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (tmdb_id) DO UPDATE SET
      title = EXCLUDED.title,
      source = EXCLUDED.source,
      rating = EXCLUDED.rating,
      language = EXCLUDED.language,
      adult = EXCLUDED.adult,
      release_date = EXCLUDED.release_date,
      poster_image_url = EXCLUDED.poster_image_url,
      backdrop_image_url = EXCLUDED.backdrop_image_url,
      overview = EXCLUDED.overview
    RETURNING id, tmdb_id
  `;

  const movieResult = await client.query(movieQueryText, buildMovieValues(movie));
  const dbMovieId = movieResult.rows[0]?.id;

  if (dbMovieId && Array.isArray(movie.genre_ids) && movie.genre_ids.length > 0) {
    const genrePairs = movie.genre_ids.map((genreId) => [dbMovieId, genreId]);
    await insertGenrePairs(client, genrePairs);
  }
};

const batchInsertMovies = async (movies) => {
  if (movies.length === 0) {
    return { total: 0, inserted: 0, failed: 0 };
  }

  const client = await db.pool.connect();

  try {
    try {
      await client.query('BEGIN');
      await insertMovieBatch(client, movies);
      await client.query('COMMIT');
      console.log(`Movie import summary: ${movies.length} succeeded, 0 failed, ${movies.length} total`);
      return { total: movies.length, inserted: movies.length, failed: 0 };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(
        `Bulk import failed for ${movies.length} movies. Falling back to per-movie insert:`,
        error.message
      );
    }

    let inserted = 0;
    let failed = 0;

    for (const movie of movies) {
      try {
        await client.query('BEGIN');
        await insertSingleMovie(client, movie);
        await client.query('COMMIT');
        inserted++;
      } catch (error) {
        failed++;
        await client.query('ROLLBACK');
        console.error(
          `Failed to import movie "${movie.title}" (tmdb_id: ${movie.id}):`,
          error.message
        );
      }
    }

    console.log(
      `Movie import summary: ${inserted} succeeded, ${failed} failed, ${movies.length} total`
    );
    return { total: movies.length, inserted, failed };
  } finally {
    client.release();
  }
};

const updateMovieRuntime = async (tmdb_id, runtime) => {
  try {
    const queryText = `
        UPDATE movies SET runtime = $1 WHERE tmdb_id = $2;
      `;
    const result = await db.query(queryText, [runtime, tmdb_id]);
    if (result.rowCount === 0) {
      throw new Error('Movie not found with the given tmdb_id');
    }
  } catch (error) {
    throw error;
  }
};

const getMovieRuntimeById = async (movie_id) => {
  const result = await db.query('SELECT runtime FROM movies WHERE id = $1', [
    movie_id,
  ]);
  return result.rows[0]?.runtime ?? null;
};

const getTMDBIdByMovieId = async (movie_id) => {
  try {
    const queryText = `SELECT tmdb_id FROM movies WHERE id = $1;`;
    const result = await db.query(queryText, [movie_id]);
    if (result.rows.length === 0) {
      throw new Error('Movie not found with the given id');
    }
    return result.rows[0].tmdb_id;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createGenreTable,
  fetchGenres,
  createGenreMovieTable,
  createMoviesTable,
  createMovie,
  createGenre,
  upsertGenre,
  createGenreMovie,
  batchCreateGenreMovies,
  fetchMovies,
  batchInsertMovies,
  updateMovieRuntime,
  getMovieRuntimeById,
  getMoviesFromRegion,
  getTMDBIdByMovieId,
};
