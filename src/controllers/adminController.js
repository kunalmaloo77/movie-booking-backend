const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmailOrUsername } = require('../models/userModel');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const {
  fetchAdminRevenue,
  fetchTopBookedMovies,
  fetchDailyBookingStats,
} = require('../models/bookingModel');

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Please provide email and password',
      400
    );
  }

  const user = await findUserByEmailOrUsername(email);
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  if (user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Access denied. Admin role required.', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  ApiResponse.success(res, {
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    },
    message: 'Admin login successful',
  });
};

const getAdminRevenue = async (req, res) => {
  try {
    const revenue = await fetchAdminRevenue();
    ApiResponse.success(res, {
      data: revenue,
      message: 'Successfully fetched revenue',
    });
  } catch (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server Error', 500);
  }
};

const getTopMovies = async (req, res) => {
  try {
    const movies = await fetchTopBookedMovies();
    ApiResponse.success(res, {
      data: movies,
      message: 'Successfully fetched top booked movies',
    });
  } catch (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server Error', 500);
  }
};

const getDailyBookings = async (req, res) => {
  try {
    const parsedDays = parseInt(req.query.days, 10);
    const days =
      Number.isInteger(parsedDays) && parsedDays > 0
        ? Math.min(parsedDays, 365)
        : 30;
    const stats = await fetchDailyBookingStats(days);
    ApiResponse.success(res, {
      data: stats,
      message: 'Successfully fetched daily booking stats',
    });
  } catch (error) {
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server Error', 500);
  }
};

module.exports = { adminLogin, getAdminRevenue, getTopMovies, getDailyBookings };
