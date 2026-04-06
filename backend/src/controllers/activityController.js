const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// Point rules
const POINTS = {
  call: 5,
  visit: 10,
};

// ─── CREATE ACTIVITY (manual) ───
const createActivity = asyncHandler(async (req, res, next) => {
  const { employee_id, lead_id, type, branch_id } = req.body;

  if (!employee_id || !type) {
    return next(new AppError('employee_id and type are required', 400));
  }
  if (!['call', 'visit'].includes(type)) {
    return next(new AppError('type must be "call" or "visit"', 400));
  }

  // Determine branch
  let targetBranch = branch_id;
  if (req.user.role === 'employee') {
    targetBranch = req.user.branch_id;
  } else if (!targetBranch) {
    // Get branch from the employee
    const [emp] = await pool.execute('SELECT branch_id FROM users WHERE id = ?', [employee_id]);
    if (emp.length > 0) targetBranch = emp[0].branch_id;
  }

  if (!targetBranch) {
    return next(new AppError('Could not determine branch', 400));
  }

  // Verify employee exists
  const [emp] = await pool.execute(
    'SELECT id FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
    [employee_id, targetBranch]
  );
  if (emp.length === 0) {
    return next(new AppError('Employee not found in this branch', 400));
  }

  // Verify lead if provided
  if (lead_id) {
    const [lead] = await pool.execute(
      'SELECT id FROM leads WHERE id = ? AND branch_id = ?',
      [lead_id, targetBranch]
    );
    if (lead.length === 0) {
      return next(new AppError('Lead not found in this branch', 400));
    }
  }

  const points = POINTS[type];

  // Insert activity
  const [result] = await pool.execute(
    `INSERT INTO employee_activities (employee_id, lead_id, type, points, branch_id)
     VALUES (?, ?, ?, ?, ?)`,
    [employee_id, lead_id || null, type, points, targetBranch]
  );

  // Auto-add points to ledger
  const [leadInfo] = lead_id
    ? await pool.execute('SELECT name FROM leads WHERE id = ?', [lead_id])
    : [[]];
  const leadName = leadInfo.length > 0 ? leadInfo[0].name : 'N/A';

  await pool.execute(
    `INSERT INTO points_ledger (user_id, points, reason, branch_id)
     VALUES (?, ?, ?, ?)`,
    [employee_id, points, `${type === 'call' ? 'Call' : 'Visit'} activity - Lead: ${leadName}`, targetBranch]
  );

  await activityLogger(
    req.user.user_id, 'create', 'activities', result.insertId,
    { employee_id, type, points }, req.ip, targetBranch
  );

  const [created] = await pool.execute(
    `SELECT ea.*, u.name as employee_name, l.name as lead_name
     FROM employee_activities ea
     LEFT JOIN users u ON ea.employee_id = u.id
     LEFT JOIN leads l ON ea.lead_id = l.id
     WHERE ea.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: `Activity created (+${points} points)`,
    data: created[0],
  });
});

// ─── GET ALL ACTIVITIES ───
const getAllActivities = asyncHandler(async (req, res) => {
  const {
    employee_id, lead_id, type, branch_id: filterBranch,
    date_from, date_to,
    page = 1, limit = 50, sort_order = 'DESC',
  } = req.query;

  const branchFilter = await getBranchFilter(req.user, 'ea');

  let query = `
    SELECT ea.*, u.name as employee_name, l.name as lead_name, l.phone as lead_phone,
           b.name as branch_name
    FROM employee_activities ea
    LEFT JOIN users u ON ea.employee_id = u.id
    LEFT JOIN leads l ON ea.lead_id = l.id
    LEFT JOIN branches b ON ea.branch_id = b.id
    WHERE 1=1 ${branchFilter.clause}
  `;
  let countQuery = `SELECT COUNT(*) as total FROM employee_activities ea WHERE 1=1 ${branchFilter.clause}`;
  const params = [...branchFilter.params];
  const countParams = [...branchFilter.params];

  if (employee_id) {
    query += ' AND ea.employee_id = ?';
    countQuery += ' AND ea.employee_id = ?';
    params.push(parseInt(employee_id, 10));
    countParams.push(parseInt(employee_id, 10));
  }

  if (lead_id) {
    query += ' AND ea.lead_id = ?';
    countQuery += ' AND ea.lead_id = ?';
    params.push(parseInt(lead_id, 10));
    countParams.push(parseInt(lead_id, 10));
  }

  if (type && ['call', 'visit'].includes(type)) {
    query += ' AND ea.type = ?';
    countQuery += ' AND ea.type = ?';
    params.push(type);
    countParams.push(type);
  }

  if (filterBranch) {
    query += ' AND ea.branch_id = ?';
    countQuery += ' AND ea.branch_id = ?';
    params.push(parseInt(filterBranch, 10));
    countParams.push(parseInt(filterBranch, 10));
  }

  if (date_from) {
    query += ' AND ea.created_at >= ?';
    countQuery += ' AND ea.created_at >= ?';
    params.push(date_from);
    countParams.push(date_from);
  }
  if (date_to) {
    query += ' AND ea.created_at <= ?';
    countQuery += ' AND ea.created_at <= ?';
    params.push(date_to + ' 23:59:59');
    countParams.push(date_to + ' 23:59:59');
  }

  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY ea.created_at ${sortDir}`;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, (pageNum - 1) * limitNum);

  const [activities] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: activities,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─── GET ACTIVITY STATS ───
const getActivityStats = asyncHandler(async (req, res) => {
  const { employee_id, date_from, date_to } = req.query;
  const branchFilter = await getBranchFilter(req.user, 'ea');

  let dateFilter = '';
  const dateParams = [];
  if (date_from) {
    dateFilter += ' AND ea.created_at >= ?';
    dateParams.push(date_from);
  }
  if (date_to) {
    dateFilter += ' AND ea.created_at <= ?';
    dateParams.push(date_to + ' 23:59:59');
  }

  let empFilter = '';
  const empParams = [];
  if (employee_id) {
    empFilter = ' AND ea.employee_id = ?';
    empParams.push(parseInt(employee_id, 10));
  }

  const allParams = [...branchFilter.params, ...empParams, ...dateParams];

  // Summary by type
  const [summary] = await pool.execute(
    `SELECT ea.type, COUNT(*) as count, SUM(ea.points) as total_points
     FROM employee_activities ea
     WHERE 1=1 ${branchFilter.clause}${empFilter}${dateFilter}
     GROUP BY ea.type`,
    allParams
  );

  // Top employees by points
  const [topEmployees] = await pool.execute(
    `SELECT ea.employee_id, u.name as employee_name, u.branch_id,
            COUNT(*) as activity_count, SUM(ea.points) as total_points,
            SUM(CASE WHEN ea.type = 'call' THEN 1 ELSE 0 END) as calls,
            SUM(CASE WHEN ea.type = 'visit' THEN 1 ELSE 0 END) as visits
     FROM employee_activities ea
     LEFT JOIN users u ON ea.employee_id = u.id
     WHERE 1=1 ${branchFilter.clause}${dateFilter}
     GROUP BY ea.employee_id, u.name, u.branch_id
     ORDER BY total_points DESC
     LIMIT 20`,
    [...branchFilter.params, ...dateParams]
  );

  res.json({
    success: true,
    data: {
      summary: summary.reduce((acc, s) => {
        acc[s.type] = { count: s.count, points: s.total_points };
        return acc;
      }, {}),
      top_employees: topEmployees,
    },
  });
});

// ─── GET ACTIVITY BY ID ───
const getActivityById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'ea');

  const [activities] = await pool.execute(
    `SELECT ea.*, u.name as employee_name, l.name as lead_name, b.name as branch_name
     FROM employee_activities ea
     LEFT JOIN users u ON ea.employee_id = u.id
     LEFT JOIN leads l ON ea.lead_id = l.id
     LEFT JOIN branches b ON ea.branch_id = b.id
     WHERE ea.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );

  if (activities.length === 0) {
    return next(new AppError('Activity not found or access denied', 404));
  }

  res.json({ success: true, data: activities[0] });
});

module.exports = {
  createActivity,
  getAllActivities,
  getActivityStats,
  getActivityById,
};
