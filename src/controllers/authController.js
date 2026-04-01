const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmailOrUsername } = require('../models/userModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');

const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError('VALIDATION_ERROR', 'Please provide all fields', 400);
  }

  const existingUser = await findUserByEmailOrUsername(email, username);
  if (existingUser) {
    throw new AppError('DUPLICATE_ENTRY', 'User already exists', 409);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await createUser(username, email, hashedPassword);

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  ApiResponse.success(res, {
    data: {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at,
      },
      token,
    },
    message: 'User registered successfully',
    statusCode: 201,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError('VALIDATION_ERROR', 'Please provide email and password', 400);
  }

  const user = await findUserByEmailOrUsername(email);
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
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
      },
      token,
    },
    message: 'Login successful',
  });
};

module.exports = {
  register,
  login,
};
