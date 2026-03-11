const {
  createShow,
  findShowsByScreenId,
  findShowsByMovieId,
  findSeatsByShowId,
  createShowSeat,
  findSeatsByScreenId,
} = require('../models/showsModel.js');

const {
  fetchAndUpdateMovieRuntime,
} = require('../controllers/movieController.js');
const { getTMDBIdByMovieId } = require('../models/moviesModel.js');

const createShowSeatByScreenId = async (show_id, screen_id, price) => {
  try {
    const seats = await findSeatsByScreenId(screen_id);
    const showSeats = [];
    for (const seat of seats) {
      const { id: seat_id } = seat;
      const showSeat = await createShowSeat(show_id, seat_id, price);
      showSeats.push(showSeat);
    }
    return showSeats;
  } catch (error) {
    throw new Error('Failed to create show seats');
  }
};

const createNewShow = async (req, res) => {
  const { movie_id, screen_id, show_date, show_time, price, language } =
    req.body;

  if (
    !movie_id ||
    !screen_id ||
    !show_date ||
    !show_time ||
    !price ||
    !language
  ) {
    return res.status(400).json({
      message:
        'All fields are required: movie_id, screen_id, show_date, show_time, price, language.',
    });
  }

  try {
    const show = await createShow(
      movie_id,
      screen_id,
      show_date,
      show_time,
      price,
      language
    );

    await createShowSeatByScreenId(show.id, screen_id, price);

    const tmdb_id = await getTMDBIdByMovieId(movie_id);

    if (tmdb_id) {
      await fetchAndUpdateMovieRuntime(tmdb_id);
    }
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShowsByScreenId = async (req, res) => {
  try {
    const { screen_id } = req.params;
    const shows = await findShowsByScreenId(screen_id);
    res.status(200).json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShowsByMovieId = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const shows = await findShowsByMovieId(movie_id);
    res.status(200).json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSeatsByShowId = async (req, res) => {
  try {
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

    res
      .status(200)
      .json({ data: layout, message: 'Seats fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNewShow,
  getShowsByScreenId,
  getShowsByMovieId,
  getSeatsByShowId,
};
