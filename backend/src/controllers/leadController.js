const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// ─── CREATE LEAD ───
const createLead = asyncHandler(async (req, res, next) => {
  const { name, email, phone, company, source, status, category_id, branch_id, assigned_to, notes } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Lead name is required', 400));
  }
  if (!phone || !phone.trim()) {
    return next(new AppError('Phone number is required', 400));
  }

  // Determine branch_id: admin can specify, others use their own
  let targetBranch = branch_id;
  if (req.user.role === 'employee') {
    targetBranch = req.user.branch_id;
  } else if (req.user.role === 'sub_admin') {
    // Sub-admin must specify a branch they have access to
    if (!targetBranch) {
      targetBranch = req.user.branch_id;
    }
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

  // Verify branch exists
  const [branchCheck] = await pool.execute(
    'SELECT id FROM branches WHERE id = ? AND is_active = 1',
    [targetBranch]
  );
  if (branchCheck.length === 0) {
    return next(new AppError('Invalid or inactive branch', 400));
  }

  // Check duplicate phone within branch
  const trimmedPhone = phone.trim();
  const [dupeLead] = await pool.execute(
    'SELECT id FROM leads WHERE phone = ? AND branch_id = ?',
    [trimmedPhone, targetBranch]
  );
  if (dupeLead.length > 0) {
    return next(new AppError('A lead with this phone number already exists in this branch', 409));
  }

  // Validate category if provided
  if (category_id) {
    const [cat] = await pool.execute(
      'SELECT id FROM categories WHERE id = ? AND is_active = 1',
      [category_id]
    );
    if (cat.length === 0) {
      return next(new AppError('Invalid or inactive category', 400));
    }
  }

  // Validate assigned_to if provided
  if (assigned_to) {
    const [emp] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
      [assigned_to, targetBranch]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  // Validate status
  const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  const leadStatus = status && validStatuses.includes(status) ? status : 'new';

  const [result] = await pool.execute(
    `INSERT INTO leads (name, email, phone, company, source, status, category_id, branch_id, assigned_to, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      email || null,
      trimmedPhone,
      company || null,
      source || null,
      leadStatus,
      category_id || null,
      targetBranch,
      assigned_to || null,
      notes || null,
      req.user.user_id,
    ]
  );

  await activityLogger(
    req.user.user_id, 'create', 'leads', result.insertId,
    { name: name.trim(), phone: trimmedPhone }, req.ip, targetBranch
  );

  const [created] = await pool.execute(
    `SELECT l.*, c.name as category_name, u.name as assigned_to_name, cr.name as created_by_name, b.name as branch_name
     FROM leads l
     LEFT JOIN categories c ON l.category_id = c.id
     LEFT JOIN users u ON l.assigned_to = u.id
     LEFT JOIN users cr ON l.created_by = cr.id
     LEFT JOIN branches b ON l.branch_id = b.id
     WHERE l.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: created[0],
  });
});

// ─── GET ALL LEADS ───
const getAllLeads = asyncHandler(async (req, res) => {
  const {
    search, status, category_id, assigned_to,
    source, branch_id: filterBranch,
    page = 1, limit = 50, sort_by = 'created_at', sort_order = 'DESC',
  } = req.query;

  const branchFilter = await getBranchFilter(req.user, 'l');

  let query = `
    SELECT l.*, c.name as category_name, u.name as assigned_to_name,
           cr.name as created_by_name, b.name as branch_name
    FROM leads l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    LEFT JOIN users cr ON l.created_by = cr.id
    LEFT JOIN branches b ON l.branch_id = b.id
    WHERE 1=1 ${branchFilter.clause}
  `;
  let countQuery = `
    SELECT COUNT(*) as total FROM leads l WHERE 1=1 ${branchFilter.clause}
  `;
  const params = [...branchFilter.params];
  const countParams = [...branchFilter.params];

  // Employee sees only their assigned leads
  if (req.user.role === 'employee') {
    query += ' AND (l.assigned_to = ? OR l.created_by = ?)';
    countQuery += ' AND (l.assigned_to = ? OR l.created_by = ?)';
    params.push(req.user.user_id, req.user.user_id);
    countParams.push(req.user.user_id, req.user.user_id);
  }

  if (search) {
    query += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.company LIKE ?)';
    countQuery += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
    countParams.push(s, s, s, s);
  }

  if (status) {
    query += ' AND l.status = ?';
    countQuery += ' AND l.status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (category_id) {
    query += ' AND l.category_id = ?';
    countQuery += ' AND l.category_id = ?';
    params.push(parseInt(category_id, 10));
    countParams.push(parseInt(category_id, 10));
  }

  if (assigned_to) {
    query += ' AND l.assigned_to = ?';
    countQuery += ' AND l.assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
    countParams.push(parseInt(assigned_to, 10));
  }

  if (source) {
    query += ' AND l.source = ?';
    countQuery += ' AND l.source = ?';
    params.push(source);
    countParams.push(source);
  }

  if (filterBranch) {
    query += ' AND l.branch_id = ?';
    countQuery += ' AND l.branch_id = ?';
    params.push(parseInt(filterBranch, 10));
    countParams.push(parseInt(filterBranch, 10));
  }

  // Sorting
  const allowedSorts = ['created_at', 'name', 'status', 'updated_at'];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY l.${sortCol} ${sortDir}`;

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const [leads] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: leads,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ─── GET LEAD BY ID ───
const getLeadById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'l');

  const [leads] = await pool.execute(
    `SELECT l.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM leads l
     LEFT JOIN categories c ON l.category_id = c.id
     LEFT JOIN users u ON l.assigned_to = u.id
     LEFT JOIN users cr ON l.created_by = cr.id
     LEFT JOIN branches b ON l.branch_id = b.id
     WHERE l.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );

  if (leads.length === 0) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  // Fetch notes for this lead
  const [notes] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.notable_type = 'lead' AND n.notable_id = ?
     ORDER BY n.created_at DESC`,
    [id]
  );

  // Fetch follow-ups
  const [followUps] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     WHERE f.lead_id = ?
     ORDER BY f.followup_date DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...leads[0],
      notes,
      follow_ups: followUps,
    },
  });
});

// ─── UPDATE LEAD ───
const updateLead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, company, source, status, category_id, assigned_to, notes } = req.body;

  const branchFilter = await getBranchFilter(req.user, 'l');

  // Verify lead exists and user has access
  const [existing] = await pool.execute(
    `SELECT l.* FROM leads l WHERE l.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  const lead = existing[0];

  // Employee can only update status of assigned leads
  if (req.user.role === 'employee') {
    if (lead.assigned_to !== req.user.user_id) {
      return next(new AppError('You can only update leads assigned to you', 403));
    }
    // Employees can update status and notes only
    if (name || email || phone || company || source || category_id || assigned_to) {
      return next(new AppError('You can only update status and notes for assigned leads', 403));
    }
  }

  // Check phone duplicate if changing
  if (phone && phone.trim() !== lead.phone) {
    const [dupe] = await pool.execute(
      'SELECT id FROM leads WHERE phone = ? AND branch_id = ? AND id != ?',
      [phone.trim(), lead.branch_id, id]
    );
    if (dupe.length > 0) {
      return next(new AppError('Another lead with this phone exists in this branch', 409));
    }
  }

  // Validate status
  if (status) {
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid lead status', 400));
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
      [assigned_to, lead.branch_id]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  await pool.execute(
    `UPDATE leads SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      company = COALESCE(?, company),
      source = COALESCE(?, source),
      status = COALESCE(?, status),
      category_id = COALESCE(?, category_id),
      assigned_to = COALESCE(?, assigned_to),
      notes = COALESCE(?, notes)
     WHERE id = ?`,
    [
      name ? name.trim() : null,
      email !== undefined ? email : null,
      phone ? phone.trim() : null,
      company !== undefined ? company : null,
      source !== undefined ? source : null,
      status || null,
      category_id || null,
      assigned_to || null,
      notes !== undefined ? notes : null,
      id,
    ]
  );

  await activityLogger(
    req.user.user_id, 'update', 'leads', parseInt(id, 10),
    req.body, req.ip, lead.branch_id
  );

  const [updated] = await pool.execute(
    `SELECT l.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM leads l
     LEFT JOIN categories c ON l.category_id = c.id
     LEFT JOIN users u ON l.assigned_to = u.id
     LEFT JOIN users cr ON l.created_by = cr.id
     LEFT JOIN branches b ON l.branch_id = b.id
     WHERE l.id = ?`,
    [id]
  );

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: updated[0],
  });
});

// ─── DELETE LEAD ───
const deleteLead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'l');

  const [existing] = await pool.execute(
    `SELECT l.id, l.name, l.status FROM leads l WHERE l.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  // Cannot delete converted leads
  if (existing[0].status === 'converted') {
    return next(new AppError('Cannot delete a converted lead', 400));
  }

  // Delete related records first (notes, follow-ups)
  await pool.execute(
    "DELETE FROM notes WHERE notable_type = 'lead' AND notable_id = ?",
    [id]
  );

  await pool.execute('DELETE FROM leads WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'leads', parseInt(id, 10),
    { name: existing[0].name }, req.ip, req.user.branch_id
  );

  res.json({
    success: true,
    message: 'Lead deleted successfully',
  });
});

// ─── CONVERT LEAD TO CLIENT ───
const convertLeadToClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { address, company, email: overrideEmail } = req.body;
  const branchFilter = await getBranchFilter(req.user, 'l');

  // Find lead
  const [leads] = await pool.execute(
    `SELECT l.* FROM leads l WHERE l.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (leads.length === 0) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  const lead = leads[0];

  if (lead.status === 'converted') {
    return next(new AppError('This lead has already been converted', 400));
  }

  // Check if a client with this phone already exists in the same branch
  const [existingClient] = await pool.execute(
    'SELECT id FROM clients WHERE phone = ? AND branch_id = ?',
    [lead.phone, lead.branch_id]
  );
  if (existingClient.length > 0) {
    return next(new AppError('A client with this phone number already exists in this branch', 409));
  }

  // Create client from lead data
  const [clientResult] = await pool.execute(
    `INSERT INTO clients (name, email, phone, company, address, category_id, branch_id, assigned_to, lead_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lead.name,
      overrideEmail || lead.email || null,
      lead.phone,
      company || lead.company || null,
      address || null,
      lead.category_id,
      lead.branch_id,
      lead.assigned_to,
      lead.id,
      req.user.user_id,
    ]
  );

  // Update lead status to converted
  await pool.execute(
    "UPDATE leads SET status = 'converted' WHERE id = ?",
    [id]
  );

  await activityLogger(
    req.user.user_id, 'convert', 'leads', parseInt(id, 10),
    { client_id: clientResult.insertId, name: lead.name }, req.ip, lead.branch_id
  );

  // Fetch the new client
  const [newClient] = await pool.execute(
    `SELECT cl.*, c.name as category_name, u.name as assigned_to_name,
            cr.name as created_by_name, b.name as branch_name
     FROM clients cl
     LEFT JOIN categories c ON cl.category_id = c.id
     LEFT JOIN users u ON cl.assigned_to = u.id
     LEFT JOIN users cr ON cl.created_by = cr.id
     LEFT JOIN branches b ON cl.branch_id = b.id
     WHERE cl.id = ?`,
    [clientResult.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Lead converted to client successfully',
    data: {
      client: newClient[0],
      lead_id: lead.id,
    },
  });
});

// ─── ASSIGN LEAD ───
const assignLead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) {
    return next(new AppError('assigned_to (employee ID) is required', 400));
  }

  const branchFilter = await getBranchFilter(req.user, 'l');

  const [leads] = await pool.execute(
    `SELECT l.* FROM leads l WHERE l.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (leads.length === 0) {
    return next(new AppError('Lead not found or access denied', 404));
  }

  const lead = leads[0];

  // Verify employee exists in the same branch
  const [emp] = await pool.execute(
    'SELECT id, name FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
    [assigned_to, lead.branch_id]
  );
  if (emp.length === 0) {
    return next(new AppError('Employee not found in this branch', 400));
  }

  await pool.execute(
    'UPDATE leads SET assigned_to = ? WHERE id = ?',
    [assigned_to, id]
  );

  await activityLogger(
    req.user.user_id, 'assign', 'leads', parseInt(id, 10),
    { assigned_to, employee_name: emp[0].name }, req.ip, lead.branch_id
  );

  res.json({
    success: true,
    message: `Lead assigned to ${emp[0].name}`,
  });
});

// ─── GET LEAD STATS ───
const getLeadStats = asyncHandler(async (req, res) => {
  const branchFilter = await getBranchFilter(req.user, 'l');

  const [stats] = await pool.execute(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN l.status = 'new' THEN 1 ELSE 0 END) as new_count,
       SUM(CASE WHEN l.status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
       SUM(CASE WHEN l.status = 'qualified' THEN 1 ELSE 0 END) as qualified_count,
       SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END) as converted_count,
       SUM(CASE WHEN l.status = 'lost' THEN 1 ELSE 0 END) as lost_count
     FROM leads l
     WHERE 1=1 ${branchFilter.clause}`,
    branchFilter.params
  );

  res.json({
    success: true,
    data: stats[0],
  });
});

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  convertLeadToClient,
  assignLead,
  getLeadStats,
};
