const ApiResponse = require('../utils/ApiResponse');

const errorHandler = (err, req, res, next) => {
  // Already sent a response (e.g. webhook handler)
  if (res.headersSent) {
    return next(err);
  }

  // Operational errors thrown via AppError
  if (err.isOperational) {
    return ApiResponse.error(res, {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return ApiResponse.error(res, {
      code: 'DUPLICATE_ENTRY',
      message: 'A record with that value already exists',
      statusCode: 409,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }

  // Unhandled errors — log and return generic message
  console.error('Unhandled error:', err);
  return ApiResponse.error(res, {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
};

module.exports = errorHandler;
