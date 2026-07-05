const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const Razorpay = require('razorpay');
const pino_http = require('pino-http');

const errorHandler = require('./middleware/errorHandler.js');
const AppError = require('./utils/AppError.js');

const authRoutes = require('./routes/authRoutes.js');
const regionRoutes = require('./routes/regionRoutes.js');
const cinemaRoutes = require('./routes/cinemaRoutes.js');
const movieRoutes = require('./routes/movieRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const showRoutes = require('./routes/showRoutes.js');
const screenRoutes = require('./routes/screenRoutes.js');
const seatRoutes = require('./routes/seatRoutes.js');
const bookingRoutes = require('./routes/bookingRoutes.js');

const { createUserTable } = require('./models/userModel.js');
const { createRegionTable } = require('./models/regionModel.js');
const { createCinemaTable } = require('./models/cinemaModel.js');
const {
  createScreensTable,
  createScreensTypeTable,
} = require('./models/screenModel.js');
const {
  createMoviesTable,
  createGenreTable,
  createGenreMovieTable,
} = require('./models/moviesModel.js');
const {
  createShowsTable,
  createShowSeatsTable,
  migrateShowsLanguageToFk,
} = require('./models/showsModel.js');
const {
  createLanguagesTable,
  seedLanguages,
} = require('./models/languageModel.js');
const {
  createBookingSeatsTable,
  createBookingTable,
} = require('./models/bookingModel.js');

const {
  createSeatsTable,
  createSeatCategoriesTable,
} = require('./models/seatModel.js');

const db = require('./config/db.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const logger = pino_http({
  level: process.env.LOG_LEVEL || 'info',
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
});

app.use(logger);

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
app.set('razorpay', razorpayInstance);
app.set('db', db);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);

// Webhook must be registered before express.json() so raw body is preserved for signature verification
app.use(
  '/api/booking/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      req.rawBody = req.body;
      req.body = JSON.parse(req.body.toString());
      next();
    } catch (error) {
      return next(new AppError('BAD_REQUEST', 'Invalid JSON payload', 400));
    }
  }
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/region', regionRoutes);
app.use('/api/movie', movieRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/show', showRoutes);
app.use('/api/screen', screenRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/booking', bookingRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Centralized error handler — must be registered after all routes
app.use(errorHandler);

const startServer = async () => {
  try {
    await createRegionTable();
    await createUserTable();
    await createCinemaTable();
    await createScreensTypeTable();
    await createScreensTable();
    await createMoviesTable();
    await createGenreTable();
    await createGenreMovieTable();
    await createLanguagesTable();
    await seedLanguages();
    await createShowsTable();
    await migrateShowsLanguageToFk();
    await createSeatCategoriesTable();
    await createSeatsTable();
    await createShowSeatsTable();
    await createBookingTable();
    await createBookingSeatsTable();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
