const jwt = require('jsonwebtoken');
const { getUserRoleFromId } = require('../models/userModel');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Check if token follows "Bearer <token>" format
    const tokenString = token.startsWith('Bearer ')
      ? token.slice(7, token.length)
      : token;

    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const adminVerification = async (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Check if token follows "Bearer <token>" format
    const tokenString = token.startsWith('Bearer ')
      ? token.slice(7, token.length)
      : token;

    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
    req.user = decoded;
    const userRole = await getUserRoleFromId(decoded.id);
    if (userRole !== 'ADMIN' && decoded.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ message: 'Access denied. Admin role required.' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = { verifyToken, adminVerification };
