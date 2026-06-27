const db = require('../config/db');
const AppError = require('../utils/AppError');
const PAGE_LIMIT = 10;

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

const getMoviesFromRegion = async (page = 1, region_id) => {
  const offset = (page - 1) * PAGE_LIMIT;
  const values = [region_id, PAGE_LIMIT, offset];
  try {
    const queryText = `
    SELECT m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating, m.overview, m.adult, m.created_at, 
          STRING_AGG(DISTINCT g.name, ', ') AS genres
          FROM movies m
          JOIN genre_movies gm ON m.id = gm.movie_id
          JOIN genres g ON gm.genre_id = g.id
          JOIN shows s ON m.id = s.movie_id AND s.start_time > NOW()
          JOIN screens sc ON s.screen_id = sc.id
          JOIN cinemas c ON sc.cinema_id = c.id
          WHERE c.region_id = $1
		  GROUP BY m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating, m.overview, m.adult
          ORDER BY m.created_at DESC
          LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(queryText, values);
    const totalPages = Math.ceil(result.rows.length / PAGE_LIMIT);
    return {
      total_pages: totalPages,
      current_page: page,
      data: result.rows,
    };
  } catch (error) {
    console.error('Error fetching movies from region:', error);
    throw error;
  }
};

const createGenreMovieTable = async () => {
  const queryText = `
    create table if not exists genre_movies (
        id serial primary key,
        genre_id int not null references genres(id) ON DELETE CASCADE,
        movie_id int not null references movies(id) ON DELETE CASCADE,
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
    ${whereClause} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(PAGE_LIMIT, offset);

  const result = await db.query(queryText, values);
  const totalPages = Math.ceil(result.rows[0]?.total_count || 0 / PAGE_LIMIT);
  const data = result.rows.map(({ total_count, ...movieData }) => movieData);

  return {
    total_pages: totalPages,
    current_page: page,
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

  const movieResult = await client.query(
    movieQueryText,
    buildMovieValues(movie)
  );
  const dbMovieId = movieResult.rows[0]?.id;

  if (
    dbMovieId &&
    Array.isArray(movie.genre_ids) &&
    movie.genre_ids.length > 0
  ) {
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
      console.log(
        `Movie import summary: ${movies.length} succeeded, 0 failed, ${movies.length} total`
      );
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

const updateMovieById = async (
  id,
  {
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
  }
) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const movieResult = await client.query(
      `UPDATE movies
       SET title=$1, rating=$2, language=$3, adult=$4, runtime=$5,
           release_date=$6, poster_image_url=$7, backdrop_image_url=$8, overview=$9
       WHERE id=$10
       RETURNING id, title, source, tmdb_id, rating, language, adult, runtime,
                 release_date, poster_image_url, backdrop_image_url, overview, created_at`,
      [
        title,
        rating,
        language,
        adult,
        runtime,
        release_date,
        poster_image_url,
        backdrop_image_url,
        overview,
        id,
      ]
    );

    if (movieResult.rowCount === 0) {
      throw new AppError('NOT_FOUND', 'Movie not found', 404);
    }

    await client.query('DELETE FROM genre_movies WHERE movie_id = $1', [id]);

    if (genre_ids && genre_ids.length > 0) {
      const values = [];
      const placeholders = genre_ids.map((genre_id, i) => {
        const base = i * 2;
        values.push(genre_id, id);
        return `($${base + 1}, $${base + 2})`;
      });
      await client.query(
        `INSERT INTO genre_movies (genre_id, movie_id) VALUES ${placeholders.join(', ')} ON CONFLICT (genre_id, movie_id) DO NOTHING`,
        values
      );
    }

    await client.query('COMMIT');
    return movieResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteMovieById = async (id) => {
  const showCheck = await db.query(
    'SELECT COUNT(*) FROM shows WHERE movie_id = $1 AND start_time > NOW()',
    [id]
  );
  if (parseInt(showCheck.rows[0].count) > 0) {
    throw new AppError(
      'CONFLICT',
      'Cannot delete a movie that has upcoming shows.',
      409
    );
  }
  const result = await db.query(
    'DELETE FROM movies WHERE id = $1 RETURNING id',
    [id]
  );
  if (result.rowCount === 0) {
    throw new AppError('NOT_FOUND', 'Movie not found', 404);
  }
  return result.rows[0];
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

const getMoviesFromRegionWithFilters = async (
  page = 1,
  region_id,
  { language_id, genre_id, screen_type_id } = {}
) => {
  const offset = (page - 1) * PAGE_LIMIT;
  const conditions = ['c.region_id = $1', 's.start_time > CURRENT_TIMESTAMP'];
  const values = [region_id];
  let paramIdx = 2;

  if (language_id) {
    conditions.push(`s.language_id = $${paramIdx++}`);
    values.push(parseInt(language_id));
  }
  if (genre_id) {
    conditions.push(
      `EXISTS (SELECT 1 FROM genre_movies gm2 WHERE gm2.movie_id = m.id AND gm2.genre_id = $${paramIdx++})`
    );
    values.push(parseInt(genre_id));
  }
  if (screen_type_id) {
    conditions.push(`sc.screen_type = $${paramIdx++}`);
    values.push(parseInt(screen_type_id));
  }

  const whereClause = conditions.join(' AND ');
  values.push(PAGE_LIMIT, offset);
  const limitIdx = paramIdx;
  const offsetIdx = paramIdx + 1;

  const queryText = `
    SELECT m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating, m.overview,
           m.adult, m.created_at, m.language,
           STRING_AGG(DISTINCT g.name, ', ') AS genres,
           COUNT(*) OVER() AS total_count
    FROM movies m
    JOIN genre_movies gm ON m.id = gm.movie_id
    JOIN genres g ON gm.genre_id = g.id
    JOIN shows s ON m.id = s.movie_id
    JOIN screens sc ON s.screen_id = sc.id
    JOIN cinemas c ON sc.cinema_id = c.id
    WHERE ${whereClause}
    GROUP BY m.id, m.title, m.poster_image_url, m.backdrop_image_url, m.rating,
             m.overview, m.adult, m.created_at, m.language
    ORDER BY m.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  try {
    const result = await db.query(queryText, values);
    const total = parseInt(result.rows[0]?.total_count || 0);
    const totalPages = Math.ceil(total / PAGE_LIMIT);
    const data = result.rows.map(({ total_count, ...row }) => row);
    return { total_pages: totalPages, current_page: page, total, data };
  } catch (error) {
    console.error('Error fetching movies with filters:', error);
    throw error;
  }
};

const getFilterOptionsForRegion = async (region_id) => {
  try {
    const [languages, genres, screenTypes] = await Promise.all([
      db.query(
        `SELECT DISTINCT l.id, l.name
         FROM shows s
         JOIN languages l ON s.language_id = l.id
         JOIN screens sc ON s.screen_id = sc.id
         JOIN cinemas c ON sc.cinema_id = c.id
         WHERE c.region_id = $1 AND s.start_time > CURRENT_TIMESTAMP
         ORDER BY l.name`,
        [region_id]
      ),
      db.query(
        `SELECT DISTINCT g.id, g.name
         FROM genres g
         JOIN genre_movies gm ON g.id = gm.genre_id
         JOIN movies m ON gm.movie_id = m.id
         JOIN shows s ON m.id = s.movie_id
         JOIN screens sc ON s.screen_id = sc.id
         JOIN cinemas c ON sc.cinema_id = c.id
         WHERE c.region_id = $1 AND s.start_time > CURRENT_TIMESTAMP
         ORDER BY g.name`,
        [region_id]
      ),
      db.query(
        `SELECT DISTINCT st.id, st.name
         FROM screen_types st
         JOIN screens sc ON st.id = sc.screen_type
         JOIN cinemas c ON sc.cinema_id = c.id
         JOIN shows s ON sc.id = s.screen_id
         WHERE c.region_id = $1 AND s.start_time > CURRENT_TIMESTAMP
         ORDER BY st.name`,
        [region_id]
      ),
    ]);
    return {
      languages: languages.rows,
      genres: genres.rows,
      screen_types: screenTypes.rows,
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
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
  updateMovieById,
  deleteMovieById,
  getMovieRuntimeById,
  getMoviesFromRegion,
  getTMDBIdByMovieId,
  getMoviesFromRegionWithFilters,
  getFilterOptionsForRegion,
};
