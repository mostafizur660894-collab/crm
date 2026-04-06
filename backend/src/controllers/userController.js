const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');

// ─── CREATE USER (ADMIN ONLY) ───
const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role_id, branch_id, branch_access, is_super } = req.body;

  // Validate required
  if (!name || !email || !password || !role_id) {
    return next(new AppError('Name, email, password, and role_id are required', 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400));
  }

  // Prevent creating another admin
  const [targetRole] = await pool.execute(
    'SELECT id, name FROM roles WHERE id = ?',
    [role_id]
  );
  if (targetRole.length === 0) {
    return next(new AppError('Invalid role_id', 400));
  }

  if (targetRole[0].name === 'admin' && req.user.role !== 'admin') {
    return next(new AppError('Only admin can create admin users', 403));
  }

  // Sub-admin cannot create admin or sub-admin
  if (req.user.role === 'sub_admin' && !req.user.is_super && ['admin', 'sub_admin'].includes(targetRole[0].name)) {
    return next(new AppError('You cannot create users with this role', 403));
  }

  // Even super sub-admin cannot create admin or other sub-admin
  if (req.user.role === 'sub_admin' && req.user.is_super && ['admin', 'sub_admin'].includes(targetRole[0].name)) {
    return next(new AppError('Sub-admins cannot create admin or sub-admin users', 403));
  }

  // Only admin can set is_super flag
  const superFlag = (req.user.role === 'admin' && targetRole[0].name === 'sub_admin' && is_super) ? 1 : 0;

  // Check duplicate email
  const [existingUser] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingUser.length > 0) {
    return next(new AppError('Email already registered', 409));
  }

  // Verify branch exists if provided
  if (branch_id) {
    const [branch] = await pool.execute(
      'SELECT id FROM branches WHERE id = ? AND is_active = 1',
      [branch_id]
    );
    if (branch.length === 0) {
      return next(new AppError('Invalid or inactive branch_id', 400));
    }
  }

  // Employee and client must have branch_id
  if (['employee', 'client'].includes(targetRole[0].name) && !branch_id) {
    return next(new AppError('branch_id is required for employee and client roles', 400));
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);
  const uuid = uuidv4();

  const [result] = await pool.execute(
    `INSERT INTO users (uuid, name, email, phone, password, role_id, branch_id, is_super)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid, name, email, phone || null, hashedPassword, role_id, branch_id || null, superFlag]
  );

  const userId = result.insertId;

  // If sub_admin and branch_access array is provided, assign branch access
  if (targetRole[0].name === 'sub_admin' && Array.isArray(branch_access) && branch_access.length > 0) {
    // Validate all branch ids
    const branchPlaceholders = branch_access.map(() => '?').join(',');
    const [validBranches] = await pool.execute(
      `SELECT id FROM branches WHERE id IN (${branchPlaceholders}) AND is_active = 1`,
      branch_access
    );

    const validIds = validBranches.map((b) => b.id);
    for (const bid of validIds) {
      await pool.execute(
        'INSERT IGNORE INTO user_branch_access (user_id, branch_id) VALUES (?, ?)',
        [userId, bid]
      );
    }
  }

  await activityLogger(
    req.user.user_id, 'create', 'users', userId,
    { name, email, role: targetRole[0].name, branch_id },
    req.ip, branch_id || null
  );

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      id: userId,
      uuid,
      name,
      email,
      role: targetRole[0].name,
      role_id,
      branch_id: branch_id || null,
      is_super: superFlag,
    },
  });
});

// ─── GET ALL USERS ───
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, branch_id, branch_access } = req.user;
  const { role_filter, branch_filter, status, search, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role_id, u.branch_id,
           u.is_active, u.is_super, u.last_login, u.created_at,
           r.name as role_name,
           b.name as branch_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  // Branch filter based on role
  if (role === 'sub_admin') {
    const accessibleIds = [...(branch_access || [])];
    if (branch_id) accessibleIds.push(branch_id);
    if (accessibleIds.length > 0) {
      const ph = accessibleIds.map(() => '?').join(',');
      query += ` AND u.branch_id IN (${ph})`;
      countQuery += ` AND u.branch_id IN (${ph})`;
      params.push(...accessibleIds);
      countParams.push(...accessibleIds);
    } else {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(limit, 10), pages: 0 } });
    }
  } else if (role === 'employee') {
    if (!branch_id) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(limit, 10), pages: 0 } });
    }
    query += ' AND u.branch_id = ?';
    countQuery += ' AND u.branch_id = ?';
    params.push(branch_id);
    countParams.push(branch_id);
  }

  // Optional filters
  if (role_filter) {
    query += ' AND r.name = ?';
    countQuery += ' AND r.name = ?';
    params.push(role_filter);
    countParams.push(role_filter);
  }

  if (branch_filter) {
    query += ' AND u.branch_id = ?';
    countQuery += ' AND u.branch_id = ?';
    params.push(parseInt(branch_filter, 10));
    countParams.push(parseInt(branch_filter, 10));
  }

  if (status !== undefined) {
    const isActive = status === 'active' ? 1 : 0;
    query += ' AND u.is_active = ?';
    countQuery += ' AND u.is_active = ?';
    params.push(isActive);
    countParams.push(isActive);
  }

  if (search) {
    query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
    countQuery += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
    countParams.push(searchParam, searchParam, searchParam);
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const [users] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ─── GET USER BY ID ───
const getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [users] = await pool.execute(
    `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role_id, u.branch_id,
            u.is_active, u.is_super, u.last_login, u.created_at,
            r.name as role_name,
            b.name as branch_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = ?`,
    [id]
  );

  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];

  // Non-admin branch check
  if (req.user.role === 'sub_admin') {
    const accessibleIds = [...(req.user.branch_access || [])];
    if (req.user.branch_id) accessibleIds.push(req.user.branch_id);
    if (user.branch_id && !accessibleIds.includes(user.branch_id)) {
      return next(new AppError('You do not have access to this user', 403));
    }
  } else if (req.user.role === 'employee' && user.branch_id !== req.user.branch_id) {
    return next(new AppError('You do not have access to this user', 403));
  }

  // Fetch branch access if sub_admin
  let branchAccess = [];
  if (user.role_name === 'sub_admin') {
    const [access] = await pool.execute(
      `SELECT uba.branch_id, b.name as branch_name
       FROM user_branch_access uba
       JOIN branches b ON uba.branch_id = b.id
       WHERE uba.user_id = ?`,
      [id]
    );
    branchAccess = access;
  }

  res.json({
    success: true,
    data: {
      ...user,
      branch_access: branchAccess,
    },
  });
});

// ─── UPDATE USER ───
const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, role_id, branch_id, is_active, branch_access, is_super } = req.body;

  // Verify user exists
  const [existing] = await pool.execute(
    'SELECT u.id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Prevent self-demotion for admin
  if (parseInt(id, 10) === req.user.user_id && role_id) {
    const [newRole] = await pool.execute('SELECT name FROM roles WHERE id = ?', [role_id]);
    if (newRole.length > 0 && newRole[0].name !== 'admin' && req.user.role === 'admin') {
      return next(new AppError('Admin cannot demote themselves', 400));
    }
  }

  // Check email duplicate
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Invalid email format', 400));
    }
    const [dupe] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, id]
    );
    if (dupe.length > 0) {
      return next(new AppError('Email already in use by another user', 409));
    }
  }

  // Validate role_id if provided
  if (role_id) {
    const [roleCheck] = await pool.execute('SELECT id, name FROM roles WHERE id = ?', [role_id]);
    if (roleCheck.length === 0) {
      return next(new AppError('Invalid role_id', 400));
    }
    // Sub-admin cannot assign admin role
    if (req.user.role === 'sub_admin' && ['admin', 'sub_admin'].includes(roleCheck[0].name)) {
      return next(new AppError('You cannot assign this role', 403));
    }
  }

  // Only admin can set is_super; only valid for sub_admin role
  let superValue = null;
  if (is_super !== undefined && req.user.role === 'admin') {
    // Determine the final role (new role_id or existing)
    let finalRoleName = existing[0].role_name;
    if (role_id) {
      const [rr] = await pool.execute('SELECT name FROM roles WHERE id = ?', [role_id]);
      if (rr.length > 0) finalRoleName = rr[0].name;
    }
    superValue = (finalRoleName === 'sub_admin' && is_super) ? 1 : 0;
  }

  // Validate branch_id if provided
  if (branch_id) {
    const [branchCheck] = await pool.execute(
      'SELECT id FROM branches WHERE id = ? AND is_active = 1',
      [branch_id]
    );
    if (branchCheck.length === 0) {
      return next(new AppError('Invalid or inactive branch_id', 400));
    }
  }

  await pool.execute(
    `UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      role_id = COALESCE(?, role_id),
      branch_id = COALESCE(?, branch_id),
      is_active = COALESCE(?, is_active),
      is_super = COALESCE(?, is_super)
     WHERE id = ?`,
    [name || null, email || null, phone || null, role_id || null, branch_id || null, is_active !== undefined ? is_active : null, superValue, id]
  );

  // Update branch_access for sub_admin
  if (Array.isArray(branch_access)) {
    // Clear existing access
    await pool.execute('DELETE FROM user_branch_access WHERE user_id = ?', [id]);

    // Insert new access
    if (branch_access.length > 0) {
      const branchPlaceholders = branch_access.map(() => '?').join(',');
      const [validBranches] = await pool.execute(
        `SELECT id FROM branches WHERE id IN (${branchPlaceholders}) AND is_active = 1`,
        branch_access
      );
      for (const b of validBranches) {
        await pool.execute(
          'INSERT INTO user_branch_access (user_id, branch_id) VALUES (?, ?)',
          [id, b.id]
        );
      }
    }
  }

  await activityLogger(
    req.user.user_id, 'update', 'users', parseInt(id, 10),
    req.body, req.ip, req.user.branch_id
  );

  // Return updated user
  const [updatedUser] = await pool.execute(
    `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role_id, u.branch_id,
            u.is_active, u.is_super, r.name as role_name, b.name as branch_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = ?`,
    [id]
  );

  // Fetch updated branch access
  let updatedBranchAccess = [];
  if (updatedUser[0].role_name === 'sub_admin') {
    const [access] = await pool.execute(
      `SELECT uba.branch_id, b.name as branch_name
       FROM user_branch_access uba
       JOIN branches b ON uba.branch_id = b.id
       WHERE uba.user_id = ?`,
      [id]
    );
    updatedBranchAccess = access;
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      ...updatedUser[0],
      branch_access: updatedBranchAccess,
    },
  });
});

// ─── DELETE (DEACTIVATE) USER ───
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.user_id) {
    return next(new AppError('You cannot deactivate your own account', 400));
  }

  const [existing] = await pool.execute(
    'SELECT u.id, u.name, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Sub-admin cannot delete admin
  if (req.user.role === 'sub_admin' && existing[0].role_name === 'admin') {
    return next(new AppError('You cannot deactivate an admin', 403));
  }

  // Super sub-admin cannot delete employees (restricted action: delete_employee)
  if (req.user.role === 'sub_admin' && req.user.is_super && ['employee', 'sub_admin'].includes(existing[0].role_name)) {
    return next(new AppError('Super sub-admins cannot delete/deactivate users. Contact admin.', 403));
  }

  await pool.execute(
    'UPDATE users SET is_active = 0 WHERE id = ?',
    [id]
  );

  await activityLogger(
    req.user.user_id, 'delete', 'users', parseInt(id, 10),
    { name: existing[0].name }, req.ip, req.user.branch_id
  );

  res.json({
    success: true,
    message: 'User deactivated successfully',
  });
});

// ─── ASSIGN BRANCH ACCESS TO SUB-ADMIN ───
const assignBranchAccess = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { branch_ids } = req.body;

  if (!Array.isArray(branch_ids)) {
    return next(new AppError('branch_ids must be an array', 400));
  }

  // Verify user is sub_admin
  const [user] = await pool.execute(
    'SELECT u.id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [id]
  );
  if (user.length === 0) {
    return next(new AppError('User not found', 404));
  }
  if (user[0].role_name !== 'sub_admin') {
    return next(new AppError('Branch access can only be assigned to sub-admin users', 400));
  }

  // Clear existing
  await pool.execute('DELETE FROM user_branch_access WHERE user_id = ?', [id]);

  // Insert new
  if (branch_ids.length > 0) {
    const placeholders = branch_ids.map(() => '?').join(',');
    const [validBranches] = await pool.execute(
      `SELECT id FROM branches WHERE id IN (${placeholders}) AND is_active = 1`,
      branch_ids
    );

    for (const b of validBranches) {
      await pool.execute(
        'INSERT INTO user_branch_access (user_id, branch_id) VALUES (?, ?)',
        [id, b.id]
      );
    }
  }

  // Fetch final access
  const [access] = await pool.execute(
    `SELECT uba.branch_id, b.name as branch_name
     FROM user_branch_access uba
     JOIN branches b ON uba.branch_id = b.id
     WHERE uba.user_id = ?`,
    [id]
  );

  await activityLogger(
    req.user.user_id, 'assign_branch_access', 'users', parseInt(id, 10),
    { branch_ids }, req.ip, req.user.branch_id
  );

  res.json({
    success: true,
    message: 'Branch access updated successfully',
    data: access,
  });
});

// ─── GET ALL ROLES ───
const getRoles = asyncHandler(async (req, res) => {
  const [roles] = await pool.execute(
    'SELECT id, name, description, is_system FROM roles ORDER BY id ASC'
  );

  res.json({
    success: true,
    data: roles,
  });
});

// ─── GET ROLE PERMISSIONS ───
const getRolePermissions = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [role] = await pool.execute('SELECT id, name FROM roles WHERE id = ?', [id]);
  if (role.length === 0) {
    return next(new AppError('Role not found', 404));
  }

  const [permissions] = await pool.execute(
    `SELECT p.id, p.name, p.module, p.description
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.module, p.name`,
    [id]
  );

  res.json({
    success: true,
    data: {
      role: role[0],
      permissions,
    },
  });
});

// ─── UPDATE ROLE PERMISSIONS ───
const updateRolePermissions = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids)) {
    return next(new AppError('permission_ids must be an array', 400));
  }

  const [role] = await pool.execute('SELECT id, name, is_system FROM roles WHERE id = ?', [id]);
  if (role.length === 0) {
    return next(new AppError('Role not found', 404));
  }

  // Cannot modify admin permissions
  if (role[0].name === 'admin') {
    return next(new AppError('Admin role permissions cannot be modified', 400));
  }

  // Clear existing permissions for this role
  await pool.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);

  // Insert new permissions
  if (permission_ids.length > 0) {
    const placeholders = permission_ids.map(() => '?').join(',');
    const [validPerms] = await pool.execute(
      `SELECT id FROM permissions WHERE id IN (${placeholders})`,
      permission_ids
    );

    for (const p of validPerms) {
      await pool.execute(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [id, p.id]
      );
    }
  }

  await activityLogger(
    req.user.user_id, 'update_permissions', 'roles', parseInt(id, 10),
    { permission_ids }, req.ip, req.user.branch_id
  );

  // Return updated
  const [updated] = await pool.execute(
    `SELECT p.id, p.name, p.module, p.description
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.module, p.name`,
    [id]
  );

  res.json({
    success: true,
    message: 'Role permissions updated successfully',
    data: {
      role: role[0],
      permissions: updated,
    },
  });
});

// ─── GET ALL PERMISSIONS (for UI dropdowns) ───
const getAllPermissions = asyncHandler(async (req, res) => {
  const [permissions] = await pool.execute(
    'SELECT id, name, module, description FROM permissions ORDER BY module, name'
  );

  // Group by module
  const grouped = {};
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }

  res.json({
    success: true,
    data: permissions,
    grouped,
  });
});

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignBranchAccess,
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  getAllPermissions,
};
