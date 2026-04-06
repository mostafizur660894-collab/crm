const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database/connection');
const config = require('../config');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');

// ─── REGISTER ───
const register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role_id, branch_id } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role_id) {
    return next(new AppError('Name, email, password, and role_id are required', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  // Validate password strength
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400));
  }

  // Check if email already exists
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingUsers.length > 0) {
    return next(new AppError('Email already registered', 409));
  }

  // Verify role exists
  const [roles] = await pool.execute(
    'SELECT id, name FROM roles WHERE id = ?',
    [role_id]
  );
  if (roles.length === 0) {
    return next(new AppError('Invalid role_id', 400));
  }

  // Verify branch exists if provided
  if (branch_id) {
    const [branches] = await pool.execute(
      'SELECT id FROM branches WHERE id = ? AND is_active = 1',
      [branch_id]
    );
    if (branches.length === 0) {
      return next(new AppError('Invalid or inactive branch_id', 400));
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const uuid = uuidv4();
  const [result] = await pool.execute(
    `INSERT INTO users (uuid, name, email, phone, password, role_id, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid, name, email, phone || null, hashedPassword, role_id, branch_id || null]
  );

  // Log activity
  await activityLogger(
    result.insertId,
    'register',
    'auth',
    result.insertId,
    { email, role: roles[0].name },
    req.ip,
    branch_id || null
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      id: result.insertId,
      uuid,
      name,
      email,
      role: roles[0].name,
    },
  });
});

// ─── LOGIN ───
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  // Find user with role info
  const [users] = await pool.execute(
    `SELECT u.id, u.uuid, u.name, u.email, u.password, u.role_id, u.branch_id, u.is_active,
            u.is_super, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = ?`,
    [email]
  );

  if (users.length === 0) {
    return next(new AppError('Invalid email or password', 401));
  }

  const user = users[0];

  // Check if account is active
  if (!user.is_active) {
    return next(new AppError('Account is deactivated. Contact admin.', 403));
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Fetch user permissions
  const [permissions] = await pool.execute(
    `SELECT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [user.role_id]
  );

  const permissionList = permissions.map((p) => p.name);

  // Fetch branch access for sub_admin
  let branchAccess = [];
  if (user.role_name === 'sub_admin') {
    const [branches] = await pool.execute(
      `SELECT branch_id FROM user_branch_access WHERE user_id = ?`,
      [user.id]
    );
    branchAccess = branches.map((b) => b.branch_id);
  }

  // Generate JWT
  const tokenPayload = {
    user_id: user.id,
    uuid: user.uuid,
    role_id: user.role_id,
    role: user.role_name,
    branch_id: user.branch_id,
    branch_access: branchAccess,
  };

  const token = jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: '1d',
  });

  // Update last_login
  await pool.execute(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  // Log activity
  await activityLogger(
    user.id,
    'login',
    'auth',
    user.id,
    { email },
    req.ip,
    user.branch_id
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
        branch_id: user.branch_id,
        is_super: user.is_super === 1,
        branch_access: branchAccess,
        permissions: permissionList,
      },
    },
  });
});

// ─── GET CURRENT USER (me) ───
const getMe = asyncHandler(async (req, res, next) => {
  const [users] = await pool.execute(
    `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role_id, u.branch_id,
            u.is_active, u.is_super, u.last_login, u.created_at,
            r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user.user_id]
  );

  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];

  // Fetch permissions
  const [permissions] = await pool.execute(
    `SELECT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [user.role_id]
  );

  const permissionList = permissions.map((p) => p.name);

  // Fetch branch access for sub_admin
  let branchAccess = [];
  if (user.role_name === 'sub_admin') {
    const [branches] = await pool.execute(
      `SELECT branch_id FROM user_branch_access WHERE user_id = ?`,
      [user.id]
    );
    branchAccess = branches.map((b) => b.branch_id);
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role_name,
      role_id: user.role_id,
      branch_id: user.branch_id,
      is_super: user.is_super === 1,
      branch_access: branchAccess,
      permissions: permissionList,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
    },
  });
});

// ─── CHANGE PASSWORD ───
const changePassword = asyncHandler(async (req, res, next) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return next(new AppError('Current password and new password are required', 400));
  }

  if (new_password.length < 8) {
    return next(new AppError('New password must be at least 8 characters', 400));
  }

  // Fetch current user
  const [users] = await pool.execute(
    'SELECT id, password FROM users WHERE id = ?',
    [req.user.user_id]
  );

  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Verify current password
  const isValid = await bcrypt.compare(current_password, users[0].password);
  if (!isValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(new_password, salt);

  await pool.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, req.user.user_id]
  );

  // Log activity
  await activityLogger(
    req.user.user_id,
    'change_password',
    'auth',
    req.user.user_id,
    {},
    req.ip,
    req.user.branch_id
  );

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = { register, login, getMe, changePassword };
