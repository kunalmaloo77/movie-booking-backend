const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

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
const { createScreensTable } = require('./models/screenModel.js');
const {
  createMoviesTable,
  createGenereTable,
  createGenreMovieTable,
} = require('./models/moviesModel.js');
const {
  createShowsTable,
  createSeatCategoriesTable,
  createSeatsTable,
  createShowSeatsTable,
} = require('./models/showsModel.js');
const {
  createBookingSeatsTable,
  createBookingTable,
} = require('./models/bookingModel.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/region', regionRoutes);
app.use('/api/movie', movieRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/show', showRoutes);
app.use('/api/screen', screenRoutes);
app.use('/api/seat', seatRoutes);
app.use('/api/booking', bookingRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Initialize Database and Start Server
const startServer = async () => {
  try {
    await createRegionTable();
    await createCinemaTable();
    await createScreensTable();
    await createMoviesTable();
    await createGenereTable();
    await createGenreMovieTable();
    await createShowsTable();
    await createSeatCategoriesTable();
    await createSeatsTable();
    await createShowSeatsTable();
    await createBookingTable();
    await createBookingSeatsTable();
    await createUserTable();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
