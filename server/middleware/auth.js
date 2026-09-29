const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header, verifies it,
 * and attaches user to req.user.
 */
async function auth(req, res, next) {
  try {
    const header = req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'popo-dev-secret');

    const user = await User.findById(decoded.userId).select('-otp -otpExpiry');
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Optional auth — attaches user if token present, continues otherwise.
 */
async function optionalAuth(req, res, next) {
  try {
    const header = req.header('Authorization');
    if (header && header.startsWith('Bearer ')) {
      const token = header.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'popo-dev-secret');
      req.user = await User.findById(decoded.userId).select('-otp -otpExpiry');
      req.userId = req.user?._id;
    }
  } catch (e) {
    // Silently continue without auth
  }
  next();
}

module.exports = { auth, optionalAuth };
