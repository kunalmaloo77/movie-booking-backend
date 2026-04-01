class ApiResponse {
  static success(res, { data = null, message = null, statusCode = 200, pagination = null } = {}) {
    const response = {
      success: true,
      data,
      message,
    };
    if (pagination) {
      response.pagination = pagination;
    }
    return res.status(statusCode).json(response);
  }

  static error(res, { code, message, statusCode = 500, details = null } = {}) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}

module.exports = ApiResponse;
