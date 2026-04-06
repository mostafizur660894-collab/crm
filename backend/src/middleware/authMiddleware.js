const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const { pool } = require('../database/connection');

/**
 * Verifies JWT token from Authorization header.
 * Attaches decoded user info to req.user.
 * Also verifies user still exists and is active in DB.
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access denied. No token provided.', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Access denied. Invalid token format.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Verify user still exists and is active
    const [users] = await pool.execute(
      `SELECT u.id, u.uuid, u.name, u.email, u.role_id, u.branch_id, u.is_active,
              u.is_super, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.uuid = ?`,
      [decoded.user_id, decoded.uuid]
    );

    if (users.length === 0) {
      return next(new AppError('User no longer exists.', 401));
    }

    if (!users[0].is_active) {
      return next(new AppError('Account has been deactivated.', 403));
    }

    // Attach user info to request
    req.user = {
      user_id: users[0].id,
      uuid: users[0].uuid,
      name: users[0].name,
      email: users[0].email,
      role_id: users[0].role_id,
      role: users[0].role_name,
      branch_id: users[0].branch_id,
      is_super: users[0].is_super === 1,
      branch_access: decoded.branch_access || [],
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please log in again.', 401));
    }
    next(error);
  }
};

module.exports = authenticate;
