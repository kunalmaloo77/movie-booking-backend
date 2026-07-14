const jwt = require('jsonwebtoken');
const { getUserRoleFromId } = require('../models/userModel');
const AppError = require('../utils/AppError');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return next(
      new AppError(
        'AUTH_TOKEN_MISSING',
        'Access denied. No token provided.',
        401
      )
    );
  }

  try {
    const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return next(
      new AppError('AUTH_TOKEN_INVALID', 'Invalid or expired token.', 401)
    );
  }
};

const adminVerification = async (req, res, next) => {
  verifyToken(req, res, async (err) => {
    if (err) return next(err);
    try {
      // DB is the source of truth — a stale token claiming ADMIN must not
      // outrank a role change
      const userRole = await getUserRoleFromId(req.user.id);
      if (userRole !== 'ADMIN') {
        return next(
          new AppError('FORBIDDEN', 'Access denied. Admin role required.', 403)
        );
      }
      next();
    } catch (error) {
      console.error('Admin verification error:', error);
      return next(new AppError('AUTH_TOKEN_INVALID', 'Invalid token.', 401));
    }
  });
};

module.exports = { verifyToken, adminVerification };
