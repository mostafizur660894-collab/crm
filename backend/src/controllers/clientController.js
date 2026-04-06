const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// ─── CREATE CLIENT ───
const createClient = asyncHandler(async (req, res, next) => {
  const { name, email, phone, company, address, category_id, branch_id, assigned_to } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Client name is required', 400));
  }
  if (!phone || !phone.trim()) {
    return next(new AppError('Phone number is required', 400));
  }

  // Determine branch
  let targetBranch = branch_id;
  if (req.user.role === 'employee') {
    targetBranch = req.user.branch_id;
  } else if (req.user.role === 'sub_admin') {
    if (!targetBranch) targetBranch = req.user.branch_id;
    const accessFilter = await getBranchFilter(req.user);
    if (accessFilter.clause) {
      const [check] = await pool.execute(
        `SELECT id FROM branches WHERE id = ? ${accessFilter.clause}`,
        [targetBranch, ...accessFilter.params]
      );
      if (check.length === 0) {
        return next(new AppError('You do not have access to this branch', 403));
      }
    }
  }

  if (!targetBranch) {
    return next(new AppError('branch_id is required', 400));
  }

  // Verify branch
  const [branchCheck] = await pool.execute(
    'SELECT id FROM branches WHERE id = ? AND is_active = 1',
    [targetBranch]
  );
  if (branchCheck.length === 0) {
    return next(new AppError('Invalid or inactive branch', 400));
  }

  // Duplicate phone check
  const trimmedPhone = phone.trim();
  const [dupeClient] = await pool.execute(
    'SELECT id FROM clients WHERE phone = ? AND branch_id = ?',
    [trimmedPhone, targetBranch]
  );
  if (dupeClient.length > 0) {
    return next(new AppError('A client with this phone number already exists in this branch', 409));
  }

  // Validate category
  if (category_id) {
    const [cat] = await pool.execute(
      'SELECT id FROM categories WHERE id = ? AND is_active = 1',
      [category_id]
    );
    if (cat.length === 0) {
      return next(new AppError('Invalid or inactive category', 400));
    }
  }

  // Validate assigned_to
  if (assigned_to) {
    const [emp] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
      [assigned_to, targetBranch]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Invalid email format', 400));
    }
  }

  const [result] = await pool.execute(
    `INSERT INTO clients (name, email, phone, company, address, category_id, branch_id, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      email || null,
      trimmedPhone,
      company || null,
      address || null,
      category_id || null,
      targetBranch,
      assigned_to || null,
      req.user.user_id,
    ]
  );

  await activityLogger(
    req.user.user_id, 'create', 'clients', result.insertId,
    { name: name.trim(), phone: trimmedPhone }, req.ip, targetBranch
  );

  const [created] = await pool.execute(
    `SELECT cl.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM clients cl
     LEFT JOIN categories c ON cl.category_id = c.id
     LEFT JOIN users u ON cl.assigned_to = u.id
     LEFT JOIN users cr ON cl.created_by = cr.id
     LEFT JOIN branches b ON cl.branch_id = b.id
     WHERE cl.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Client created successfully',
    data: created[0],
  });
});

// ─── GET ALL CLIENTS ───
const getAllClients = asyncHandler(async (req, res) => {
  const {
    search, status, category_id, assigned_to,
    branch_id: filterBranch,
    page = 1, limit = 50, sort_by = 'created_at', sort_order = 'DESC',
  } = req.query;

  const branchFilter = await getBranchFilter(req.user, 'cl');

  let query = `
    SELECT cl.*, c.name as category_name, u.name as assigned_to_name,
           cr.name as created_by_name, b.name as branch_name
    FROM clients cl
    LEFT JOIN categories c ON cl.category_id = c.id
    LEFT JOIN users u ON cl.assigned_to = u.id
    LEFT JOIN users cr ON cl.created_by = cr.id
    LEFT JOIN branches b ON cl.branch_id = b.id
    WHERE 1=1 ${branchFilter.clause}
  `;
  let countQuery = `
    SELECT COUNT(*) as total FROM clients cl WHERE 1=1 ${branchFilter.clause}
  `;
  const params = [...branchFilter.params];
  const countParams = [...branchFilter.params];

  // Employee sees only assigned clients
  if (req.user.role === 'employee') {
    query += ' AND (cl.assigned_to = ? OR cl.created_by = ?)';
    countQuery += ' AND (cl.assigned_to = ? OR cl.created_by = ?)';
    params.push(req.user.user_id, req.user.user_id);
    countParams.push(req.user.user_id, req.user.user_id);
  }

  if (search) {
    query += ' AND (cl.name LIKE ? OR cl.phone LIKE ? OR cl.email LIKE ? OR cl.company LIKE ?)';
    countQuery += ' AND (cl.name LIKE ? OR cl.phone LIKE ? OR cl.email LIKE ? OR cl.company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
    countParams.push(s, s, s, s);
  }

  if (status) {
    query += ' AND cl.status = ?';
    countQuery += ' AND cl.status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (category_id) {
    query += ' AND cl.category_id = ?';
    countQuery += ' AND cl.category_id = ?';
    params.push(parseInt(category_id, 10));
    countParams.push(parseInt(category_id, 10));
  }

  if (assigned_to) {
    query += ' AND cl.assigned_to = ?';
    countQuery += ' AND cl.assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
    countParams.push(parseInt(assigned_to, 10));
  }

  if (filterBranch) {
    query += ' AND cl.branch_id = ?';
    countQuery += ' AND cl.branch_id = ?';
    params.push(parseInt(filterBranch, 10));
    countParams.push(parseInt(filterBranch, 10));
  }

  const allowedSorts = ['created_at', 'name', 'status', 'updated_at'];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY cl.${sortCol} ${sortDir}`;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const [clients] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: clients,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ─── GET CLIENT BY ID ───
const getClientById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'cl');

  const [clients] = await pool.execute(
    `SELECT cl.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM clients cl
     LEFT JOIN categories c ON cl.category_id = c.id
     LEFT JOIN users u ON cl.assigned_to = u.id
     LEFT JOIN users cr ON cl.created_by = cr.id
     LEFT JOIN branches b ON cl.branch_id = b.id
     WHERE cl.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );

  if (clients.length === 0) {
    return next(new AppError('Client not found or access denied', 404));
  }

  // Fetch related notes
  const [notes] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.notable_type = 'client' AND n.notable_id = ?
     ORDER BY n.created_at DESC`,
    [id]
  );

  // Fetch follow-ups
  const [followUps] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     WHERE f.client_id = ?
     ORDER BY f.followup_date DESC`,
    [id]
  );

  // Fetch origin lead if converted
  let originLead = null;
  if (clients[0].lead_id) {
    const [leads] = await pool.execute(
      'SELECT id, name, phone, source, status, created_at FROM leads WHERE id = ?',
      [clients[0].lead_id]
    );
    if (leads.length > 0) originLead = leads[0];
  }

  res.json({
    success: true,
    data: {
      ...clients[0],
      notes,
      follow_ups: followUps,
      origin_lead: originLead,
    },
  });
});

// ─── UPDATE CLIENT ───
const updateClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, company, address, category_id, assigned_to, status } = req.body;

  const branchFilter = await getBranchFilter(req.user, 'cl');

  const [existing] = await pool.execute(
    `SELECT cl.* FROM clients cl WHERE cl.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Client not found or access denied', 404));
  }

  const client = existing[0];

  // Employee can only update their assigned clients (limited fields)
  if (req.user.role === 'employee') {
    if (client.assigned_to !== req.user.user_id) {
      return next(new AppError('You can only update clients assigned to you', 403));
    }
    if (category_id || assigned_to) {
      return next(new AppError('You can only update name, email, phone, address, and status', 403));
    }
  }

  // Duplicate phone check
  if (phone && phone.trim() !== client.phone) {
    const [dupe] = await pool.execute(
      'SELECT id FROM clients WHERE phone = ? AND branch_id = ? AND id != ?',
      [phone.trim(), client.branch_id, id]
    );
    if (dupe.length > 0) {
      return next(new AppError('Another client with this phone exists in this branch', 409));
    }
  }

  // Validate email
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Invalid email format', 400));
    }
  }

  // Validate status
  if (status) {
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid client status', 400));
    }
  }

  // Validate category
  if (category_id) {
    const [cat] = await pool.execute(
      'SELECT id FROM categories WHERE id = ? AND is_active = 1',
      [category_id]
    );
    if (cat.length === 0) {
      return next(new AppError('Invalid or inactive category', 400));
    }
  }

  // Validate assigned_to
  if (assigned_to) {
    const [emp] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
      [assigned_to, client.branch_id]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  await pool.execute(
    `UPDATE clients SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      company = COALESCE(?, company),
      address = COALESCE(?, address),
      category_id = COALESCE(?, category_id),
      assigned_to = COALESCE(?, assigned_to),
      status = COALESCE(?, status)
     WHERE id = ?`,
    [
      name ? name.trim() : null,
      email !== undefined ? email : null,
      phone ? phone.trim() : null,
      company !== undefined ? company : null,
      address !== undefined ? address : null,
      category_id || null,
      assigned_to || null,
      status || null,
      id,
    ]
  );

  await activityLogger(
    req.user.user_id, 'update', 'clients', parseInt(id, 10),
    req.body, req.ip, client.branch_id
  );

  const [updated] = await pool.execute(
    `SELECT cl.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM clients cl
     LEFT JOIN categories c ON cl.category_id = c.id
     LEFT JOIN users u ON cl.assigned_to = u.id
     LEFT JOIN users cr ON cl.created_by = cr.id
     LEFT JOIN branches b ON cl.branch_id = b.id
     WHERE cl.id = ?`,
    [id]
  );

  res.json({
    success: true,
    message: 'Client updated successfully',
    data: updated[0],
  });
});

// ─── DELETE CLIENT ───
const deleteClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'cl');

  const [existing] = await pool.execute(
    `SELECT cl.id, cl.name FROM clients cl WHERE cl.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Client not found or access denied', 404));
  }

  // Delete related records
  await pool.execute(
    "DELETE FROM notes WHERE notable_type = 'client' AND notable_id = ?",
    [id]
  );
  await pool.execute('DELETE FROM follow_ups WHERE client_id = ?', [id]);

  await pool.execute('DELETE FROM clients WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'clients', parseInt(id, 10),
    { name: existing[0].name }, req.ip, req.user.branch_id
  );

  res.json({
    success: true,
    message: 'Client deleted successfully',
  });
});

// ─── ASSIGN CLIENT ───
const assignClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) {
    return next(new AppError('assigned_to (employee ID) is required', 400));
  }

  const branchFilter = await getBranchFilter(req.user, 'cl');

  const [clients] = await pool.execute(
    `SELECT cl.* FROM clients cl WHERE cl.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (clients.length === 0) {
    return next(new AppError('Client not found or access denied', 404));
  }

  const client = clients[0];

  const [emp] = await pool.execute(
    'SELECT id, name FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
    [assigned_to, client.branch_id]
  );
  if (emp.length === 0) {
    return next(new AppError('Employee not found in this branch', 400));
  }

  await pool.execute('UPDATE clients SET assigned_to = ? WHERE id = ?', [assigned_to, id]);

  await activityLogger(
    req.user.user_id, 'assign', 'clients', parseInt(id, 10),
    { assigned_to, employee_name: emp[0].name }, req.ip, client.branch_id
  );

  res.json({
    success: true,
    message: `Client assigned to ${emp[0].name}`,
  });
});

// ─── GET CLIENT STATS ───
const getClientStats = asyncHandler(async (req, res) => {
  const branchFilter = await getBranchFilter(req.user, 'cl');

  const [stats] = await pool.execute(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN cl.status = 'active' THEN 1 ELSE 0 END) as active_count,
       SUM(CASE WHEN cl.status = 'inactive' THEN 1 ELSE 0 END) as inactive_count
     FROM clients cl
     WHERE 1=1 ${branchFilter.clause}`,
    branchFilter.params
  );

  res.json({
    success: true,
    data: stats[0],
  });
});

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  assignClient,
  getClientStats,
};
