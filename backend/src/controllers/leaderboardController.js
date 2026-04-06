const { pool } = require('../database/connection');
const asyncHandler = require('../utils/asyncHandler');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// ─── GLOBAL LEADERBOARD ───
const getLeaderboard = asyncHandler(async (req, res) => {
  const { branch_id, period, limit = 20 } = req.query;
  const bf = await getBranchFilter(req.user, 'pl');

  let dateFilter = '';
  const dateParams = [];
  if (period === 'today') {
    dateFilter = ' AND DATE(pl.created_at) = CURDATE()';
  } else if (period === 'week') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else if (period === 'month') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  } else if (period === 'year') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
  }

  let branchClause = '';
  const branchParams = [];
  if (branch_id) {
    branchClause = ' AND pl.branch_id = ?';
    branchParams.push(parseInt(branch_id, 10));
  }

  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [leaders] = await pool.execute(
    `SELECT
       u.id, u.name, u.email, u.branch_id, b.name as branch_name,
       COALESCE(SUM(pl.points), 0) as total_points,
       COUNT(pl.id) as point_entries
     FROM points_ledger pl
     JOIN users u ON pl.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE r.name = 'employee' AND u.is_active = 1
       ${bf.clause}${branchClause}${dateFilter}
     GROUP BY u.id, u.name, u.email, u.branch_id, b.name
     ORDER BY total_points DESC
     LIMIT ?`,
    [...bf.params, ...branchParams, ...dateParams, limitNum]
  );

  // Add rank
  const data = leaders.map((l, i) => ({ rank: i + 1, ...l }));

  res.json({ success: true, data });
});

// ─── BRANCH-WISE LEADERBOARD ───
const getBranchLeaderboard = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const bf = await getBranchFilter(req.user, 'pl');

  let dateFilter = '';
  if (period === 'today') {
    dateFilter = ' AND DATE(pl.created_at) = CURDATE()';
  } else if (period === 'week') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else if (period === 'month') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  } else if (period === 'year') {
    dateFilter = ' AND pl.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
  }

  const [branches] = await pool.execute(
    `SELECT
       b.id, b.name,
       COALESCE(SUM(pl.points), 0) as total_points,
       COUNT(DISTINCT pl.user_id) as active_employees
     FROM branches b
     LEFT JOIN points_ledger pl ON pl.branch_id = b.id ${dateFilter.replace(/ AND /g, ' AND ')}
     WHERE b.is_active = 1 ${bf.clause.replace(/pl\.branch_id/g, 'b.id')}
     GROUP BY b.id, b.name
     ORDER BY total_points DESC`,
    bf.params
  );

  const data = branches.map((b, i) => ({ rank: i + 1, ...b }));

  res.json({ success: true, data });
});

// ─── ANALYTICS SUMMARY ───
const getAnalytics = asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  const bf = await getBranchFilter(req.user);

  let dateFilter = '';
  const dateParams = [];
  if (date_from) {
    dateFilter += ' AND created_at >= ?';
    dateParams.push(date_from);
  }
  if (date_to) {
    dateFilter += ' AND created_at <= ?';
    dateParams.push(date_to + ' 23:59:59');
  }

  // Build branch clause without alias for simpler queries
  const bfPlain = bf.clause;
  const bfParams = bf.params;

  // Lead conversion rate
  const [leadTotal] = await pool.execute(
    `SELECT COUNT(*) as total FROM leads WHERE 1=1 ${bfPlain}${dateFilter}`,
    [...bfParams, ...dateParams]
  );
  const [leadConverted] = await pool.execute(
    `SELECT COUNT(*) as total FROM leads WHERE status = 'converted' ${bfPlain}${dateFilter}`,
    [...bfParams, ...dateParams]
  );
  const conversionRate = leadTotal[0].total > 0
    ? Math.round((leadConverted[0].total / leadTotal[0].total) * 100)
    : 0;

  // Task completion rate
  const [taskTotal] = await pool.execute(
    `SELECT COUNT(*) as total FROM tasks WHERE 1=1 ${bfPlain}${dateFilter}`,
    [...bfParams, ...dateParams]
  );
  const [taskCompleted] = await pool.execute(
    `SELECT COUNT(*) as total FROM tasks WHERE status = 'completed' ${bfPlain}${dateFilter}`,
    [...bfParams, ...dateParams]
  );
  const taskCompletionRate = taskTotal[0].total > 0
    ? Math.round((taskCompleted[0].total / taskTotal[0].total) * 100)
    : 0;

  // Points per employee (average)
  const [avgPoints] = await pool.execute(
    `SELECT ROUND(AVG(emp_points), 0) as avg_points FROM (
       SELECT user_id, SUM(points) as emp_points
       FROM points_ledger WHERE 1=1 ${bfPlain}${dateFilter}
       GROUP BY user_id
     ) sub`,
    [...bfParams, ...dateParams]
  );

  // Leads by source
  const [leadsBySource] = await pool.execute(
    `SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
     FROM leads WHERE 1=1 ${bfPlain}${dateFilter}
     GROUP BY source ORDER BY count DESC`,
    [...bfParams, ...dateParams]
  );

  // Monthly trends (last 6 months)
  const [monthlyLeads] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
     FROM leads WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) ${bfPlain}
     GROUP BY month ORDER BY month ASC`,
    bfParams
  );
  const [monthlyTasks] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
     FROM tasks WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) ${bfPlain}
     GROUP BY month ORDER BY month ASC`,
    bfParams
  );
  const [monthlyPoints] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(points) as total
     FROM points_ledger WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) ${bfPlain}
     GROUP BY month ORDER BY month ASC`,
    bfParams
  );

  // Activity breakdown
  const bfEA = await getBranchFilter(req.user, 'ea');
  const [activityBreakdown] = await pool.execute(
    `SELECT ea.type, COUNT(*) as count, SUM(ea.points) as total_points
     FROM employee_activities ea
     WHERE 1=1 ${bfEA.clause}
     GROUP BY ea.type`,
    bfEA.params
  );

  res.json({
    success: true,
    data: {
      rates: {
        lead_conversion_rate: conversionRate,
        task_completion_rate: taskCompletionRate,
        avg_points_per_employee: avgPoints[0].avg_points || 0,
      },
      leads_by_source: leadsBySource,
      activity_breakdown: activityBreakdown,
      trends: {
        leads: monthlyLeads,
        tasks: monthlyTasks,
        points: monthlyPoints,
      },
    },
  });
});

module.exports = {
  getLeaderboard,
  getBranchLeaderboard,
  getAnalytics,
};
