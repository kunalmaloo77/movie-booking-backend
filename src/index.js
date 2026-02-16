const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes.js');
const regionRoutes = require('./routes/regionRoutes.js');
const cinemaRoutes = require('./routes/cinemaRoutes.js');
const movieRoutes = require('./routes/movieRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const showRoutes = require('./routes/showsRoutes.js');

const { createUserTable } = require('./models/userModel.js');
const { createRegionTable } = require('./models/regionModel.js');
const { createCinemaTable } = require('./models/cinemaModel.js');
const { createMoviesTable, createGenereTable, createGenreMovieTable } = require('./models/moviesModel.js');
const { createShowsTable } = require('./models/showsModel.js');

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

// Health check route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Initialize Database and Start Server
const startServer = async () => {
    try {
        await createUserTable();
        await createRegionTable();
        await createCinemaTable();
        await createMoviesTable();
        await createGenereTable();
        await createGenreMovieTable();
        await createShowsTable();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();
