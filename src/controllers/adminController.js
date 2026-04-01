const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmailOrUsername } = require('../models/userModel');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('VALIDATION_ERROR', 'Please provide email and password', 400);
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

module.exports = { adminLogin };
