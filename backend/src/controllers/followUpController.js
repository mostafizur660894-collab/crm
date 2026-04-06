const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');
const { createNotification } = require('../utils/notificationHelper');

// ─── CREATE FOLLOW-UP ───
const createFollowUp = asyncHandler(async (req, res, next) => {
  const { lead_id, client_id, assigned_to, followup_date, note, branch_id } = req.body;

  if (!lead_id && !client_id) {
    return next(new AppError('Either lead_id or client_id is required', 400));
  }
  if (lead_id && client_id) {
    return next(new AppError('Provide only one of lead_id or client_id', 400));
  }
  if (!assigned_to) {
    return next(new AppError('assigned_to (employee ID) is required', 400));
  }
  if (!followup_date) {
    return next(new AppError('followup_date is required', 400));
  }

  // Determine branch
  let targetBranch = branch_id;
  if (req.user.role === 'employee') {
    targetBranch = req.user.branch_id;
  } else if (req.user.role === 'sub_admin' && !targetBranch) {
    targetBranch = req.user.branch_id;
  }

  // If no branch given, derive from lead/client
  if (!targetBranch) {
    if (lead_id) {
      const [lead] = await pool.execute('SELECT branch_id FROM leads WHERE id = ?', [lead_id]);
      if (lead.length > 0) targetBranch = lead[0].branch_id;
    } else if (client_id) {
      const [client] = await pool.execute('SELECT branch_id FROM clients WHERE id = ?', [client_id]);
      if (client.length > 0) targetBranch = client[0].branch_id;
    }
  }

  if (!targetBranch) {
    return next(new AppError('branch_id could not be determined', 400));
  }

  // Branch access check
  if (req.user.role === 'sub_admin') {
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

  // Verify lead/client exists and belongs to branch
  if (lead_id) {
    const [lead] = await pool.execute(
      'SELECT id FROM leads WHERE id = ? AND branch_id = ?',
      [lead_id, targetBranch]
    );
    if (lead.length === 0) {
      return next(new AppError('Lead not found in this branch', 400));
    }
  }
  if (client_id) {
    const [client] = await pool.execute(
      'SELECT id FROM clients WHERE id = ? AND branch_id = ?',
      [client_id, targetBranch]
    );
    if (client.length === 0) {
      return next(new AppError('Client not found in this branch', 400));
    }
  }

  // Verify assigned employee
  const [emp] = await pool.execute(
    'SELECT id, name FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
    [assigned_to, targetBranch]
  );
  if (emp.length === 0) {
    return next(new AppError('Assigned employee not found in this branch', 400));
  }

  const [result] = await pool.execute(
    `INSERT INTO follow_ups (lead_id, client_id, assigned_to, created_by, followup_date, note, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      lead_id || null,
      client_id || null,
      assigned_to,
      req.user.user_id,
      followup_date,
      note || null,
      targetBranch,
    ]
  );

  // Notify assigned employee
  const entityType = lead_id ? 'lead' : 'client';
  await createNotification(
    assigned_to,
    'New Follow-up Assigned',
    `A follow-up for a ${entityType} has been assigned to you for ${followup_date}`,
    'followup_assigned',
    'followup',
    result.insertId
  );

  await activityLogger(
    req.user.user_id, 'create', 'followups', result.insertId,
    { assigned_to, followup_date }, req.ip, targetBranch
  );

  const [created] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name,
            l.name as lead_name, l.phone as lead_phone,
            cl.name as client_name, cl.phone as client_phone,
            b.name as branch_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN clients cl ON f.client_id = cl.id
     LEFT JOIN branches b ON f.branch_id = b.id
     WHERE f.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Follow-up created successfully',
    data: created[0],
  });
});

// ─── GET ALL FOLLOW-UPS ───
const getAllFollowUps = asyncHandler(async (req, res) => {
  const {
    search, status, assigned_to, lead_id, client_id,
    branch_id: filterBranch, date_from, date_to,
    page = 1, limit = 50, sort_by = 'followup_date', sort_order = 'ASC',
  } = req.query;

  const branchFilter = await getBranchFilter(req.user, 'f');

  let query = `
    SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name,
           l.name as lead_name, l.phone as lead_phone,
           cl.name as client_name, cl.phone as client_phone,
           b.name as branch_name
    FROM follow_ups f
    LEFT JOIN users u ON f.assigned_to = u.id
    LEFT JOIN users cr ON f.created_by = cr.id
    LEFT JOIN leads l ON f.lead_id = l.id
    LEFT JOIN clients cl ON f.client_id = cl.id
    LEFT JOIN branches b ON f.branch_id = b.id
    WHERE 1=1 ${branchFilter.clause}
  `;
  let countQuery = `SELECT COUNT(*) as total FROM follow_ups f WHERE 1=1 ${branchFilter.clause}`;
  const params = [...branchFilter.params];
  const countParams = [...branchFilter.params];

  // Employee: see all branch follow-ups (per requirement)
  // No extra employee filter — they see branch follow-ups

  if (search) {
    query += ' AND (f.note LIKE ? OR l.name LIKE ? OR cl.name LIKE ?)';
    countQuery += ' AND (f.note LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
    countParams.push(s);
  }

  if (status) {
    query += ' AND f.status = ?';
    countQuery += ' AND f.status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (assigned_to) {
    query += ' AND f.assigned_to = ?';
    countQuery += ' AND f.assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
    countParams.push(parseInt(assigned_to, 10));
  }

  if (lead_id) {
    query += ' AND f.lead_id = ?';
    countQuery += ' AND f.lead_id = ?';
    params.push(parseInt(lead_id, 10));
    countParams.push(parseInt(lead_id, 10));
  }

  if (client_id) {
    query += ' AND f.client_id = ?';
    countQuery += ' AND f.client_id = ?';
    params.push(parseInt(client_id, 10));
    countParams.push(parseInt(client_id, 10));
  }

  if (filterBranch) {
    query += ' AND f.branch_id = ?';
    countQuery += ' AND f.branch_id = ?';
    params.push(parseInt(filterBranch, 10));
    countParams.push(parseInt(filterBranch, 10));
  }

  if (date_from) {
    query += ' AND f.followup_date >= ?';
    countQuery += ' AND f.followup_date >= ?';
    params.push(date_from);
    countParams.push(date_from);
  }
  if (date_to) {
    query += ' AND f.followup_date <= ?';
    countQuery += ' AND f.followup_date <= ?';
    params.push(date_to);
    countParams.push(date_to);
  }

  const allowedSorts = ['followup_date', 'created_at', 'status'];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'followup_date';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY f.${sortCol} ${sortDir}`;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const [followUps] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: followUps,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─── GET FOLLOW-UP BY ID ───
const getFollowUpById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'f');

  const [followUps] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name,
            l.name as lead_name, l.phone as lead_phone,
            cl.name as client_name, cl.phone as client_phone,
            b.name as branch_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN clients cl ON f.client_id = cl.id
     LEFT JOIN branches b ON f.branch_id = b.id
     WHERE f.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );

  if (followUps.length === 0) {
    return next(new AppError('Follow-up not found or access denied', 404));
  }

  res.json({ success: true, data: followUps[0] });
});

// ─── UPDATE FOLLOW-UP ───
const updateFollowUp = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { assigned_to, followup_date, note, status } = req.body;

  const branchFilter = await getBranchFilter(req.user, 'f');

  const [existing] = await pool.execute(
    `SELECT f.* FROM follow_ups f WHERE f.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Follow-up not found or access denied', 404));
  }

  const followUp = existing[0];

  // Employee can only update status and note of their assigned follow-ups
  if (req.user.role === 'employee') {
    if (followUp.assigned_to !== req.user.user_id) {
      return next(new AppError('You can only update follow-ups assigned to you', 403));
    }
    if (assigned_to || followup_date) {
      return next(new AppError('You can only update status and note', 403));
    }
  }

  // Validate status
  if (status) {
    const valid = ['pending', 'done', 'missed'];
    if (!valid.includes(status)) {
      return next(new AppError('Invalid follow-up status', 400));
    }
  }

  // Validate assigned_to
  if (assigned_to) {
    const [emp] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
      [assigned_to, followUp.branch_id]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  await pool.execute(
    `UPDATE follow_ups SET
      assigned_to = COALESCE(?, assigned_to),
      followup_date = COALESCE(?, followup_date),
      note = COALESCE(?, note),
      status = COALESCE(?, status)
     WHERE id = ?`,
    [assigned_to || null, followup_date || null, note !== undefined ? note : null, status || null, id]
  );

  await activityLogger(
    req.user.user_id, 'update', 'followups', parseInt(id, 10),
    req.body, req.ip, followUp.branch_id
  );

  const [updated] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name,
            l.name as lead_name, cl.name as client_name, b.name as branch_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN clients cl ON f.client_id = cl.id
     LEFT JOIN branches b ON f.branch_id = b.id
     WHERE f.id = ?`,
    [id]
  );

  res.json({ success: true, message: 'Follow-up updated successfully', data: updated[0] });
});

// ─── DELETE FOLLOW-UP ───
const deleteFollowUp = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'f');

  const [existing] = await pool.execute(
    `SELECT f.id FROM follow_ups f WHERE f.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Follow-up not found or access denied', 404));
  }

  await pool.execute('DELETE FROM follow_ups WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'followups', parseInt(id, 10),
    {}, req.ip, req.user.branch_id
  );

  res.json({ success: true, message: 'Follow-up deleted successfully' });
});

// ─── TODAY'S FOLLOW-UPS (for dashboard) ───
const getTodayFollowUps = asyncHandler(async (req, res) => {
  const branchFilter = await getBranchFilter(req.user, 'f');

  let extraFilter = '';
  const extraParams = [];
  if (req.user.role === 'employee') {
    extraFilter = ' AND f.assigned_to = ?';
    extraParams.push(req.user.user_id);
  }

  const [followUps] = await pool.execute(
    `SELECT f.*, u.name as assigned_to_name, cr.name as created_by_name,
            l.name as lead_name, cl.name as client_name
     FROM follow_ups f
     LEFT JOIN users u ON f.assigned_to = u.id
     LEFT JOIN users cr ON f.created_by = cr.id
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN clients cl ON f.client_id = cl.id
     WHERE DATE(f.followup_date) = CURDATE()
       AND f.status = 'pending'
       ${branchFilter.clause}${extraFilter}
     ORDER BY f.followup_date ASC`,
    [...branchFilter.params, ...extraParams]
  );

  res.json({ success: true, data: followUps });
});

module.exports = {
  createFollowUp,
  getAllFollowUps,
  getFollowUpById,
  updateFollowUp,
  deleteFollowUp,
  getTodayFollowUps,
};
