const {
  createShow,
  updateShow,
  deleteShowSeatsByShowId,
  updateShowSeatPrices,
  findShowsByScreenId,
  findShowsByMovieId,
  findShowById,
  findShowByIdForAdmin,
  fetchShowsForAdmin,
  batchCreateShowSeats,
  findOverlappingShows,
  findShowDetailsById,
  countBookingsForShow,
  deleteShowById,
} = require('../models/showsModel.js');

const {
  findSeatsByScreenId,
  findSeatsByShowId,
} = require('../models/seatModel.js');

const {
  fetchAndUpdateMovieRuntime,
} = require('../controllers/movieController.js');
const {
  getTMDBIdByMovieId,
  getMovieRuntimeById,
} = require('../models/moviesModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const db = require('../config/db.js');
const { findCinemaByShowId } = require('../models/cinemaModel.js');
const {
  fetchLanguages,
  getDefaultLanguageId,
} = require('../models/languageModel.js');

const fieldLabels = {
  movie_id: 'Movie ID',
  screen_id: 'Screen ID',
  start_time: 'Start Time',
  category_price: 'Category Price',
};

const validateShowPayload = (body) => {
  const missingFields = Object.keys(fieldLabels).filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Missing required fields',
      400,
      missingFields.map((field) => ({
        field,
        message: `${fieldLabels[field]} is required`,
      }))
    );
  }

  if (!Array.isArray(body.category_price) || body.category_price.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'At least one seat category price is required.',
      400
    );
  }
};

const createShowSeatByScreenId = async (
  client,
  show_id,
  screen_id,
  category_price
) => {
  const seats = await findSeatsByScreenId(screen_id);
  const seatPriceRows = seats.map((seat) => {
    const price = category_price.find(
      (cat) => cat.category_id === seat.category_id
    )?.price;
    if (price === undefined || price === null) {
      throw new AppError(
        'MISSING_PRICE',
        `Missing price for seat_category id ${seat.category_id}`,
        400
      );
    }
    return { seat_id: seat.id, price };
  });
  const showSeats = await batchCreateShowSeats(client, show_id, seatPriceRows);
  console.log(`Created ${showSeats.length} show seats for show_id ${show_id}`);
  return showSeats;
};

const createNewShow = async (req, res) => {
  validateShowPayload(req.body);

  let client;
  try {
    const { movie_id, screen_id, start_time, category_price, language_id } =
      req.body;

    // Language defaults to English when not supplied (app-layer default — a FK
    // column cannot carry a literal default value).
    const resolvedLanguageId = language_id || (await getDefaultLanguageId());

    let runtime = await getMovieRuntimeById(movie_id);

    if (!runtime) {
      const tmdb_id = await getTMDBIdByMovieId(movie_id);
      if (tmdb_id) await fetchAndUpdateMovieRuntime(tmdb_id);
      runtime = await getMovieRuntimeById(movie_id);
    }

    if (!runtime) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Movie runtime is required to check for show overlaps. Please ensure the movie has a runtime set.',
        400
      );
    }
    client = await db.pool.connect();
    await client.query('BEGIN');
    const overlapping = await findOverlappingShows(
      client,
      screen_id,
      start_time,
      runtime
    );
    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new AppError(
        'CONFLICT',
        `Show time conflicts with "${conflict.title}" starting at ${conflict.start_time} (runtime: ${conflict.runtime} min). Please choose a different time.`,
        409
      );
    }

    const show = await createShow(
      client,
      movie_id,
      screen_id,
      start_time,
      resolvedLanguageId
    );

    await createShowSeatByScreenId(client, show.id, screen_id, category_price);
    await client.query('COMMIT');
    ApiResponse.success(res, { data: show, statusCode: 201 });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err instanceof AppError) throw err;
    console.error('Error Creating shows', err);
    throw new AppError('SERVER_ERROR', 'Something went wrong', 500);
  } finally {
    if (client) client.release();
  }
};

const getShows = async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const search = req.query.search?.trim() || null;
  const region_id = req.query.region_id
    ? Number.parseInt(req.query.region_id, 10)
    : null;
  const cinema_id = req.query.cinema_id
    ? Number.parseInt(req.query.cinema_id, 10)
    : null;

  if (page < 1) {
    throw new AppError('VALIDATION_ERROR', 'Invalid page parameter.', 400);
  }

  if (region_id !== null && Number.isNaN(region_id)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid region_id parameter.', 400);
  }

  if (cinema_id !== null && Number.isNaN(cinema_id)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid cinema_id parameter.', 400);
  }

  const { data, total_pages, current_page, total_shows } =
    await fetchShowsForAdmin({
      page,
      search,
      region_id,
      cinema_id,
    });

  ApiResponse.success(res, {
    data,
    pagination: {
      page: current_page,
      pageSize: 10,
      totalPages: total_pages,
      totalItems: total_shows,
    },
  });
};

const getShowsByScreenId = async (req, res) => {
  const { screen_id } = req.params;
  const shows = await findShowsByScreenId(screen_id);
  ApiResponse.success(res, { data: shows });
};

const getShowsByMovieId = async (req, res) => {
  const { movie_id } = req.params;
  const shows = await findShowsByMovieId(movie_id);
  ApiResponse.success(res, { data: shows });
};

const getShowDetailsById = async (req, res) => {
  const { show_id } = req.params;
  try {
    const seats = await findSeatsByShowId(show_id);
    const layout = [];
    seats.forEach((seat) => {
      const { id, row_label, column_label, category_id, status, price } = seat;
      let row = layout.find((r) => r.row === row_label);
      if (!row) {
        row = {
          row: row_label,
          seats: [],
        };
        layout.push(row);
      }
      row.seats.push({ id, column_label, category_id, status, price });
    });

    const showDetails = await findShowDetailsById(show_id);

    ApiResponse.success(res, {
      data: {
        seats: layout,
        show: showDetails,
      },
      message: 'Show Details fetched successfully',
    });
  } catch (err) {
    throw new AppError('NO_DATA_ERROR', 'Error fetching seats and layout', 400);
  }
};

const getLanguages = async (req, res) => {
  const languages = await fetchLanguages();
  ApiResponse.success(res, { data: languages });
};

const updateExistingShow = async (req, res) => {
  const show_id = Number.parseInt(req.params.id, 10);
  if (!show_id) {
    throw new AppError('VALIDATION_ERROR', 'Invalid show id.', 400);
  }

  validateShowPayload(req.body);

  let client;
  try {
    const existingShow = await findShowById(show_id);
    if (!existingShow) {
      throw new AppError('NOT_FOUND', 'Show not found.', 404);
    }

    const { movie_id, screen_id, start_time, category_price, language_id } =
      req.body;

    const resolvedLanguageId = language_id || (await getDefaultLanguageId());

    let runtime = await getMovieRuntimeById(movie_id);
    if (!runtime) {
      const tmdb_id = await getTMDBIdByMovieId(movie_id);
      if (tmdb_id) await fetchAndUpdateMovieRuntime(tmdb_id);
      runtime = await getMovieRuntimeById(movie_id);
    }

    if (!runtime) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Movie runtime is required to update this show.',
        400
      );
    }

    client = await db.pool.connect();
    await client.query('BEGIN');

    const overlapping = await findOverlappingShows(
      client,
      screen_id,
      start_time,
      runtime,
      show_id
    );
    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new AppError(
        'CONFLICT',
        `Show time conflicts with "${conflict.title}" starting at ${conflict.start_time} (runtime: ${conflict.runtime} min). Please choose a different time.`,
        409
      );
    }

    const bookingCount = await countBookingsForShow(client, show_id);
    const screenChanged = Number(existingShow.screen_id) !== Number(screen_id);

    if (screenChanged && bookingCount > 0) {
      throw new AppError(
        'CONFLICT',
        'Cannot move this show to another screen after bookings have been created.',
        409
      );
    }

    const updatedShow = await updateShow(
      client,
      show_id,
      movie_id,
      screen_id,
      start_time,
      resolvedLanguageId
    );

    if (!updatedShow) {
      throw new AppError('NOT_FOUND', 'Show not found.', 404);
    }

    if (screenChanged) {
      await deleteShowSeatsByShowId(client, show_id);
      await createShowSeatByScreenId(client, show_id, screen_id, category_price);
    } else {
      const seats = await findSeatsByScreenId(screen_id);
      const seatPriceRows = seats.map((seat) => {
        const price = category_price.find(
          (cat) => Number(cat.category_id) === Number(seat.category_id)
        )?.price;

        if (price === undefined || price === null) {
          throw new AppError(
            'MISSING_PRICE',
            `Missing price for seat_category id ${seat.category_id}`,
            400
          );
        }

        return { seat_id: seat.id, price };
      });

      await updateShowSeatPrices(client, show_id, seatPriceRows);
    }

    await client.query('COMMIT');

    const show = await findShowByIdForAdmin(show_id);
    ApiResponse.success(res, {
      data: show,
      message: 'Show updated successfully',
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err instanceof AppError) throw err;
    console.error('Error updating show', err);
    throw new AppError('SERVER_ERROR', 'Something went wrong', 500);
  } finally {
    if (client) client.release();
  }
};

const deleteExistingShow = async (req, res) => {
  const show_id = Number.parseInt(req.params.id, 10);
  if (!show_id) {
    throw new AppError('VALIDATION_ERROR', 'Invalid show id.', 400);
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const existingShow = await findShowById(show_id);
    if (!existingShow) {
      throw new AppError('NOT_FOUND', 'Show not found.', 404);
    }

    const bookingCount = await countBookingsForShow(client, show_id);
    if (bookingCount > 0) {
      throw new AppError(
        'CONFLICT',
        'Cannot delete a show that already has active bookings.',
        409
      );
    }

    await deleteShowSeatsByShowId(client, show_id);
    await deleteShowById(client, show_id);

    await client.query('COMMIT');
    ApiResponse.success(res, {
      data: null,
      message: 'Show deleted successfully',
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err instanceof AppError) throw err;
    console.error('Error deleting show', err);
    throw new AppError('SERVER_ERROR', 'Something went wrong', 500);
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  createNewShow,
  getShows,
  getShowsByScreenId,
  getShowsByMovieId,
  getShowDetailsById,
  getLanguages,
  updateExistingShow,
  deleteExistingShow,
};
