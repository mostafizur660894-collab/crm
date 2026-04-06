const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');

// ─── CREATE BRANCH ───
const createBranch = asyncHandler(async (req, res, next) => {
  const { name, address, city, state, phone, email } = req.body;

  if (!name) {
    return next(new AppError('Branch name is required', 400));
  }

  // Check duplicate name
  const [existing] = await pool.execute(
    'SELECT id FROM branches WHERE name = ?',
    [name]
  );
  if (existing.length > 0) {
    return next(new AppError('A branch with this name already exists', 409));
  }

  const [result] = await pool.execute(
    `INSERT INTO branches (name, address, city, state, phone, email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, address || null, city || null, state || null, phone || null, email || null]
  );

  await activityLogger(
    req.user.user_id, 'create', 'branches', result.insertId,
    { name }, req.ip, null
  );

  // Fetch the created branch
  const [branches] = await pool.execute(
    'SELECT * FROM branches WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Branch created successfully',
    data: branches[0],
  });
});

// ─── GET ALL BRANCHES ───
const getAllBranches = asyncHandler(async (req, res) => {
  const { role, branch_id, branch_access } = req.user;
  let query = 'SELECT * FROM branches WHERE is_active = 1';
  const params = [];

  // Sub-admin: only assigned branches
  if (role === 'sub_admin') {
    const accessibleIds = [...(branch_access || [])];
    if (branch_id) accessibleIds.push(branch_id);

    if (accessibleIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const placeholders = accessibleIds.map(() => '?').join(',');
    query += ` AND id IN (${placeholders})`;
    params.push(...accessibleIds);
  }

  // Employee/Client: only own branch
  if (role === 'employee' || role === 'client') {
    if (!branch_id) {
      return res.json({ success: true, data: [] });
    }
    query += ' AND id = ?';
    params.push(branch_id);
  }

  query += ' ORDER BY name ASC';

  const [branches] = await pool.execute(query, params);

  res.json({
    success: true,
    data: branches,
  });
});

// ─── GET BRANCH BY ID ───
const getBranchById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [branches] = await pool.execute(
    'SELECT * FROM branches WHERE id = ?',
    [id]
  );

  if (branches.length === 0) {
    return next(new AppError('Branch not found', 404));
  }

  // Access control for non-admin
  const branch = branches[0];
  const { role, branch_id, branch_access } = req.user;

  if (role === 'sub_admin') {
    const accessibleIds = [...(branch_access || [])];
    if (branch_id) accessibleIds.push(branch_id);
    if (!accessibleIds.includes(branch.id)) {
      return next(new AppError('You do not have access to this branch', 403));
    }
  }

  if ((role === 'employee' || role === 'client') && branch_id !== branch.id) {
    return next(new AppError('You do not have access to this branch', 403));
  }

  // Include employee count and stats
  const [empCount] = await pool.execute(
    'SELECT COUNT(*) as count FROM users WHERE branch_id = ? AND is_active = 1',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...branch,
      employee_count: empCount[0].count,
    },
  });
});

// ─── UPDATE BRANCH ───
const updateBranch = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, address, city, state, phone, email, is_active } = req.body;

  // Verify exists
  const [existing] = await pool.execute(
    'SELECT id FROM branches WHERE id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('Branch not found', 404));
  }

  // Check duplicate name if changing
  if (name) {
    const [dupe] = await pool.execute(
      'SELECT id FROM branches WHERE name = ? AND id != ?',
      [name, id]
    );
    if (dupe.length > 0) {
      return next(new AppError('Another branch with this name already exists', 409));
    }
  }

  await pool.execute(
    `UPDATE branches SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [name || null, address || null, city || null, state || null, phone || null, email || null, is_active !== undefined ? is_active : null, id]
  );

  await activityLogger(
    req.user.user_id, 'update', 'branches', parseInt(id, 10),
    req.body, req.ip, null
  );

  const [updatedBranch] = await pool.execute(
    'SELECT * FROM branches WHERE id = ?',
    [id]
  );

  res.json({
    success: true,
    message: 'Branch updated successfully',
    data: updatedBranch[0],
  });
});

// ─── DELETE BRANCH ───
const deleteBranch = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    'SELECT id, name FROM branches WHERE id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('Branch not found', 404));
  }

  // Check if branch has active users
  const [users] = await pool.execute(
    'SELECT COUNT(*) as count FROM users WHERE branch_id = ? AND is_active = 1',
    [id]
  );
  if (users[0].count > 0) {
    return next(new AppError(
      `Cannot delete branch. ${users[0].count} active user(s) are assigned to it. Reassign them first.`,
      400
    ));
  }

  // Soft-delete by deactivating
  await pool.execute(
    'UPDATE branches SET is_active = 0 WHERE id = ?',
    [id]
  );

  await activityLogger(
    req.user.user_id, 'delete', 'branches', parseInt(id, 10),
    { name: existing[0].name }, req.ip, null
  );

  res.json({
    success: true,
    message: 'Branch deactivated successfully',
  });
});

// ─── GET BRANCH EMPLOYEES ───
const getBranchEmployees = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Verify branch exists
  const [branch] = await pool.execute(
    'SELECT id FROM branches WHERE id = ?',
    [id]
  );
  if (branch.length === 0) {
    return next(new AppError('Branch not found', 404));
  }

  const [employees] = await pool.execute(
    `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.is_active, u.created_at,
            r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.branch_id = ?
     ORDER BY u.name ASC`,
    [id]
  );

  res.json({
    success: true,
    data: employees,
  });
});

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchEmployees,
};
