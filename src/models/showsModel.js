const db = require('../config/db');

const createShowsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS shows (
        id SERIAL PRIMARY KEY,
        movie_id INT NOT NULL REFERENCES movies(id),
        screen_id INT NOT NULL REFERENCES screens(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        language_id INT NOT NULL REFERENCES languages(id),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Shows table created successfully');
  } catch (error) {
    console.error('Error creating shows table:', error);
  }
};

// Idempotent migration that converts the legacy free-text `shows.language`
// column into a `language_id` FK referencing the languages table. Safe to run
// on every boot and on both fresh and pre-existing databases. Assumes the
// languages table has already been created and seeded.
const migrateShowsLanguageToFk = async () => {
  try {
    await db.query(
      'ALTER TABLE shows ADD COLUMN IF NOT EXISTS language_id INT REFERENCES languages(id);'
    );

    // Only backfill while the legacy text column still exists.
    const { rows } = await db.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'shows' AND column_name = 'language';`
    );

    if (rows.length > 0) {
      // Preserve any language values that aren't part of the seeded fixed list.
      await db.query(
        `INSERT INTO languages (name)
         SELECT DISTINCT language FROM shows
         WHERE language IS NOT NULL
         ON CONFLICT (name) DO NOTHING;`
      );

      await db.query(
        `UPDATE shows s SET language_id = l.id
         FROM languages l
         WHERE l.name = s.language AND s.language_id IS NULL;`
      );

      // Defensive: any rows still unmapped fall back to English.
      await db.query(
        `UPDATE shows
         SET language_id = (SELECT id FROM languages WHERE name = 'English')
         WHERE language_id IS NULL;`
      );

      await db.query(
        'ALTER TABLE shows ALTER COLUMN language_id SET NOT NULL;'
      );
      await db.query('ALTER TABLE shows DROP COLUMN IF EXISTS language;');
    }

    console.log('Shows language migration completed');
  } catch (error) {
    console.error('Error migrating shows language to FK:', error);
  }
};

const createShow = async (
  client,
  movie_id,
  screen_id,
  start_time,
  language_id
) => {
  const queryText = `
    INSERT INTO shows (movie_id, screen_id, start_time, language_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, movie_id, screen_id, start_time, language_id, created_at;
  `;
  const values = [movie_id, screen_id, start_time, language_id];
  const result = await client.query(queryText, values);
  return result.rows[0];
};

const updateShow = async (
  client,
  show_id,
  movie_id,
  screen_id,
  start_time,
  language_id
) => {
  const queryText = `
    UPDATE shows
    SET movie_id = $2,
        screen_id = $3,
        start_time = $4,
        language_id = $5
    WHERE id = $1
    RETURNING id, movie_id, screen_id, start_time, language_id, status, created_at;
  `;
  const result = await client.query(queryText, [
    show_id,
    movie_id,
    screen_id,
    start_time,
    language_id,
  ]);
  return result.rows[0] || null;
};

const deleteShowSeatsByShowId = async (client, show_id) => {
  await client.query('DELETE FROM show_seats WHERE show_id = $1', [show_id]);
};

const updateShowSeatPrices = async (client, show_id, seatPriceRows) => {
  if (seatPriceRows.length === 0) return [];

  const values = [];
  const cases = seatPriceRows.map((row, index) => {
    const seatParam = index * 2 + 2;
    const priceParam = index * 2 + 3;
    values.push(row.seat_id, row.price);
    return `WHEN seat_id = $${seatParam} THEN $${priceParam}::decimal`;
  });

  const seatIds = seatPriceRows.map((row) => row.seat_id);
  const queryText = `
    UPDATE show_seats
    SET price = CASE
      ${cases.join('\n      ')}
      ELSE price
    END
    WHERE show_id = $1 AND seat_id = ANY($${values.length + 2}::int[])
    RETURNING id, show_id, seat_id, price;
  `;

  const result = await client.query(queryText, [show_id, ...values, seatIds]);
  return result.rows;
};

const findShowsByScreenId = async (screen_id) => {
  const queryText =
    "SELECT * FROM shows WHERE screen_id = $1 AND status != 'DELETED' ORDER BY start_time";
  const result = await db.query(queryText, [screen_id]);
  return result.rows;
};

const findShowsByMovieId = async (movie_id) => {
  const queryText =
    "SELECT * FROM shows WHERE movie_id = $1 AND status != 'DELETED' ORDER BY start_time";
  const result = await db.query(queryText, [movie_id]);
  return result.rows;
};

const findShowByIdForAdmin = async (show_id) => {
  const queryText = `
    SELECT
      s.id,
      s.movie_id,
      s.screen_id,
      s.start_time,
      s.language_id,
      s.status,
      s.created_at,
      scr.cinema_id,
      c.region_id,
      m.title AS movie_title,
      scr.name AS screen_name,
      c.cinema_name,
      r.city_name AS region_name,
      r.city_code,
      l.name AS language_name,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'category_id', sc.id,
            'category_name', sc.name,
            'price', ss.price
          )
        ) FILTER (WHERE sc.id IS NOT NULL),
        '[]'::json
      ) AS category_prices
    FROM shows s
    JOIN movies m ON m.id = s.movie_id
    JOIN screens scr ON scr.id = s.screen_id
    JOIN cinemas c ON c.id = scr.cinema_id
    JOIN regions r ON r.id = c.region_id
    JOIN languages l ON l.id = s.language_id
    LEFT JOIN show_seats ss ON ss.show_id = s.id
    LEFT JOIN seats seat ON seat.id = ss.seat_id
    LEFT JOIN seat_categories sc ON sc.id = seat.category_id
    WHERE s.id = $1 AND s.status != 'DELETED'
    GROUP BY
      s.id,
      s.movie_id,
      s.screen_id,
      s.start_time,
      s.language_id,
      s.status,
      s.created_at,
      scr.cinema_id,
      c.region_id,
      m.title,
      scr.name,
      c.cinema_name,
      r.city_name,
      r.city_code,
      l.name;
  `;
  const result = await db.query(queryText, [show_id]);
  return result.rows[0] || null;
};

const fetchShowsForAdmin = async ({
  page = 1,
  limit = 10,
  search = null,
  region_id = null,
  cinema_id = null,
}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(m.title ILIKE $${idx} OR c.cinema_name ILIKE $${idx} OR scr.name ILIKE $${idx} OR l.name ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx += 1;
  }

  if (region_id) {
    conditions.push(`r.id = $${idx++}`);
    values.push(region_id);
  }

  if (cinema_id) {
    conditions.push(`c.id = $${idx++}`);
    values.push(cinema_id);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')} AND s.status != 'DELETED'`
      : '';

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM shows s
    JOIN movies m ON m.id = s.movie_id
    JOIN screens scr ON scr.id = s.screen_id
    JOIN cinemas c ON c.id = scr.cinema_id
    JOIN regions r ON r.id = c.region_id
    JOIN languages l ON l.id = s.language_id
    ${whereClause};
  `;

  const countResult = await db.query(countQuery, values);
  const totalCount = Number(countResult.rows[0]?.total || 0);
  if (totalCount === 0) {
    return {
      total_pages: 0,
      current_page: page,
      total_shows: 0,
      data: [],
    };
  }

  const totalPages = Math.ceil(totalCount / limit);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * limit;

  const dataQuery = `
    SELECT
      s.id,
      s.movie_id,
      s.screen_id,
      s.start_time,
      s.language_id,
      s.status,
      s.created_at,
      m.title AS movie_title,
      scr.name AS screen_name,
      scr.cinema_id,
      c.cinema_name,
      c.region_id,
      r.city_name AS region_name,
      r.city_code,
      l.name AS language_name,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'category_id', sc.id,
            'category_name', sc.name,
            'price', ss.price
          )
        ) FILTER (WHERE sc.id IS NOT NULL),
        '[]'::json
      ) AS category_prices
    FROM shows s
    JOIN movies m ON m.id = s.movie_id
    JOIN screens scr ON scr.id = s.screen_id
    JOIN cinemas c ON c.id = scr.cinema_id
    JOIN regions r ON r.id = c.region_id
    JOIN languages l ON l.id = s.language_id
    LEFT JOIN show_seats ss ON ss.show_id = s.id
    LEFT JOIN seats seat ON seat.id = ss.seat_id
    LEFT JOIN seat_categories sc ON sc.id = seat.category_id
    ${whereClause}
    GROUP BY
      s.id,
      m.title,
      scr.name,
      scr.cinema_id,
      c.cinema_name,
      c.region_id,
      r.city_name,
      r.city_code,
      l.name
    ORDER BY s.start_time DESC, s.id DESC
    LIMIT $${idx} OFFSET $${idx + 1};
  `;

  const dataResult = await db.query(dataQuery, [...values, limit, offset]);
  return {
    total_pages: totalPages,
    current_page: safePage,
    total_shows: totalCount,
    data: dataResult.rows,
  };
};

// Returns any existing show on the same screen whose runtime window overlaps
// with [start_time, start_time + runtime_minutes).
const findOverlappingShows = async (
  client,
  screen_id,
  start_time,
  runtime_minutes,
  exclude_show_id = null
) => {
  const queryText = `
    SELECT s.id, s.start_time, m.title, m.runtime
    FROM shows s
    JOIN movies m ON s.movie_id = m.id
    WHERE s.screen_id = $1
      AND s.status == 'ACTIVE'
      AND ($4::int IS NULL OR s.id != $4)
      AND (
        s.start_time < ($2::timestamptz + ($3 || ' minutes')::interval)
        AND (s.start_time + (m.runtime || ' minutes')::interval) > $2::timestamptz
      )
    LIMIT 1;
  `;
  const result = await client.query(queryText, [
    screen_id,
    start_time,
    runtime_minutes,
    exclude_show_id,
  ]);
  return result.rows;
};

const createShowSeatsTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS show_seats (
        id SERIAL PRIMARY KEY,
        show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        price DECIMAL(10, 2) NOT NULL,
        reserved_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (show_id, seat_id)
    );
    `;
  try {
    await db.query(queryText);
    console.log('Show seats table created successfully');
  } catch (error) {
    console.error('Error creating show seats table:', error);
  }
};

const createShowSeat = async (show_id, seat_id, price) => {
  const queryText = `
    INSERT INTO show_seats (show_id, seat_id, price)
    VALUES ($1, $2, $3)
    RETURNING id, show_id, seat_id, price;
  `;
  const values = [show_id, seat_id, price];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findShowById = async (show_id) => {
  const result = await db.query(
    'SELECT id, start_time, status FROM shows WHERE id = $1',
    [show_id]
  );
  return result.rows[0] || null;
};

const findShowSeatIds = async (show_id, seat_ids) => {
  const queryText = `
    SELECT id FROM show_seats WHERE show_id = $1 AND seat_id = ANY($2);
  `;
  const result = await db.query(queryText, [show_id, seat_ids]);
  return result.rows.map((row) => row.id);
};

const batchCreateShowSeats = async (client, show_id, seatPriceRows) => {
  if (seatPriceRows.length === 0) return [];
  const values = [];
  const placeholders = seatPriceRows.map((row, i) => {
    const base = i * 3;
    values.push(show_id, row.seat_id, row.price);
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });
  const queryText = `
    INSERT INTO show_seats (show_id, seat_id, price)
    VALUES ${placeholders.join(', ')}
    RETURNING id, show_id, seat_id, price;
  `;
  const result = await client.query(queryText, values);
  return result.rows;
};

const findShowDetailsById = async (show_id) => {
  const queryText = `
   SELECT 
    c.id as cinema_id,
    c.cinema_name,
    c.cinema_code,
    c.address,
    s.start_time
    FROM shows as s
    JOIN screens as scr ON s.screen_id = scr.id
    JOIN cinemas as c ON c.id = scr.cinema_id
    WHERE s.id = $1 AND s.status != 'DELETED';
  `;
  const res = await db.query(queryText, [show_id]);
  return res.rows[0];
};

const countBookingsForShow = async (client, show_id) => {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM bookings
     WHERE show_id = $1
       AND status IN ('CREATED', 'PAYMENT_SUCCESS')`,
    [show_id]
  );
  return result.rows[0]?.total || 0;
};

const deleteShowById = async (client, show_id) => {
  const result = await client.query(
    "UPDATE shows SET status = 'DELETED' WHERE id = $1",
    [show_id]
  );

  return result.rowCount > 0;
};

module.exports = {
  createShowsTable,
  migrateShowsLanguageToFk,
  createShow,
  updateShow,
  deleteShowSeatsByShowId,
  updateShowSeatPrices,
  findShowById,
  findShowByIdForAdmin,
  findShowsByScreenId,
  findShowsByMovieId,
  fetchShowsForAdmin,
  findOverlappingShows,
  createShowSeatsTable,
  createShowSeat,
  batchCreateShowSeats,
  findShowSeatIds,
  findShowDetailsById,
  countBookingsForShow,
  deleteShowById,
};
