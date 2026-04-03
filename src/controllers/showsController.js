const {
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
  batchCreateShowSeats,
  findOverlappingShows,
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
  const fieldLabels = {
    movie_id: 'Movie ID',
    screen_id: 'Screen ID',
    start_time: 'Start Time',
    category_price: 'Category Price',
    language: 'Language',
  };

  const missingFields = Object.keys(fieldLabels).filter((field) => {
    const value = req.body[field];
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

  let client;
  try {
    const { movie_id, screen_id, start_time, category_price, language } =
      req.body;

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
      language
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

const getSeatsByShowId = async (req, res) => {
  const { show_id } = req.params;
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

  ApiResponse.success(res, {
    data: layout,
    message: 'Seats fetched successfully',
  });
};

module.exports = {
  createNewShow,
  getShowsByScreenId,
  getShowsByMovieId,
  getSeatsByShowId,
};
