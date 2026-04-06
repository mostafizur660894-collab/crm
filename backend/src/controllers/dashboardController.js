const { pool } = require('../database/connection');
const asyncHandler = require('../utils/asyncHandler');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// ─── ADMIN DASHBOARD ───
const adminDashboard = asyncHandler(async (req, res) => {
  const [leadCount] = await pool.execute('SELECT COUNT(*) as total FROM leads');
  const [clientCount] = await pool.execute('SELECT COUNT(*) as total FROM clients');
  const [taskCount] = await pool.execute('SELECT COUNT(*) as total FROM tasks');
  const [completedTasks] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE status = 'completed'"
  );
  const [pendingTasks] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE status IN ('pending','in_progress')"
  );
  const [totalPoints] = await pool.execute(
    'SELECT COALESCE(SUM(points), 0) as total FROM points_ledger'
  );
  const [totalEmployees] = await pool.execute(
    "SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'employee' AND u.is_active = 1"
  );
  const [totalBranches] = await pool.execute(
    'SELECT COUNT(*) as total FROM branches WHERE is_active = 1'
  );

  // Lead status breakdown
  const [leadsByStatus] = await pool.execute(
    'SELECT status, COUNT(*) as count FROM leads GROUP BY status'
  );

  // Task completion rate
  const totalT = taskCount[0].total;
  const completedT = completedTasks[0].total;
  const completionRate = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;

  // Recent activity logs
  const [recentActivity] = await pool.execute(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC
     LIMIT 15`
  );

  // Today's stats
  const [todayLeads] = await pool.execute(
    'SELECT COUNT(*) as total FROM leads WHERE DATE(created_at) = CURDATE()'
  );
  const [todayTasks] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE DATE(completed_at) = CURDATE() AND status = 'completed'"
  );

  res.json({
    success: true,
    data: {
      overview: {
        total_leads: leadCount[0].total,
        total_clients: clientCount[0].total,
        total_tasks: totalT,
        completed_tasks: completedT,
        pending_tasks: pendingTasks[0].total,
        task_completion_rate: completionRate,
        total_points: totalPoints[0].total,
        total_employees: totalEmployees[0].total,
        total_branches: totalBranches[0].total,
      },
      today: {
        new_leads: todayLeads[0].total,
        tasks_completed: todayTasks[0].total,
      },
      leads_by_status: leadsByStatus,
      recent_activity: recentActivity,
    },
  });
});

// ─── SUB-ADMIN DASHBOARD ───
const subAdminDashboard = asyncHandler(async (req, res) => {
  const bf = await getBranchFilter(req.user);
  const bfL = await getBranchFilter(req.user, 'l');
  const bfT = await getBranchFilter(req.user, 't');
  const bfC = await getBranchFilter(req.user, 'c');

  const [leadCount] = await pool.execute(
    `SELECT COUNT(*) as total FROM leads l WHERE 1=1 ${bfL.clause}`,
    bfL.params
  );
  const [clientCount] = await pool.execute(
    `SELECT COUNT(*) as total FROM clients c WHERE 1=1 ${bfC.clause}`,
    bfC.params
  );
  const [taskCount] = await pool.execute(
    `SELECT COUNT(*) as total FROM tasks t WHERE 1=1 ${bfT.clause}`,
    bfT.params
  );
  const [completedTasks] = await pool.execute(
    `SELECT COUNT(*) as total FROM tasks t WHERE status = 'completed' ${bfT.clause}`,
    bfT.params
  );
  const [pendingTasks] = await pool.execute(
    `SELECT COUNT(*) as total FROM tasks t WHERE status IN ('pending','in_progress') ${bfT.clause}`,
    bfT.params
  );
  const [totalPoints] = await pool.execute(
    `SELECT COALESCE(SUM(points), 0) as total FROM points_ledger pl WHERE 1=1 ${bf.clause.replace(/branch_id/g, 'pl.branch_id')}`,
    bf.params
  );
  const [totalEmployees] = await pool.execute(
    `SELECT COUNT(*) as total FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE r.name = 'employee' AND u.is_active = 1 ${bf.clause.replace(/branch_id/g, 'u.branch_id')}`,
    bf.params
  );

  const totalT = taskCount[0].total;
  const completedT = completedTasks[0].total;
  const completionRate = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;

  // Lead status breakdown
  const [leadsByStatus] = await pool.execute(
    `SELECT status, COUNT(*) as count FROM leads l WHERE 1=1 ${bfL.clause} GROUP BY status`,
    bfL.params
  );

  // Recent activity in branches
  const bfAL = await getBranchFilter(req.user, 'al');
  const [recentActivity] = await pool.execute(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE 1=1 ${bfAL.clause}
     ORDER BY al.created_at DESC
     LIMIT 15`,
    bfAL.params
  );

  // Today's follow-ups in branches
  const bfF = await getBranchFilter(req.user, 'f');
  const [todayFollowUps] = await pool.execute(
    `SELECT COUNT(*) as total FROM follow_ups f
     WHERE DATE(f.followup_date) = CURDATE() AND f.status = 'pending' ${bfF.clause}`,
    bfF.params
  );

  res.json({
    success: true,
    data: {
      overview: {
        total_leads: leadCount[0].total,
        total_clients: clientCount[0].total,
        total_tasks: totalT,
        completed_tasks: completedT,
        pending_tasks: pendingTasks[0].total,
        task_completion_rate: completionRate,
        total_points: totalPoints[0].total,
        total_employees: totalEmployees[0].total,
      },
      leads_by_status: leadsByStatus,
      today_followups: todayFollowUps[0].total,
      recent_activity: recentActivity,
    },
  });
});

// ─── EMPLOYEE DASHBOARD ───
const employeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const branchId = req.user.branch_id;

  // My tasks
  const [myTasks] = await pool.execute(
    'SELECT COUNT(*) as total FROM tasks WHERE assigned_to = ?',
    [userId]
  );
  const [myCompleted] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE assigned_to = ? AND status = 'completed'",
    [userId]
  );
  const [myPending] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE assigned_to = ? AND status IN ('pending','in_progress')",
    [userId]
  );
  const [myOverdue] = await pool.execute(
    "SELECT COUNT(*) as total FROM tasks WHERE assigned_to = ? AND status != 'completed' AND due_date < CURDATE()",
    [userId]
  );

  // My points
  const [myPoints] = await pool.execute(
    'SELECT COALESCE(SUM(points), 0) as total FROM points_ledger WHERE user_id = ?',
    [userId]
  );

  // My leads
  const [myLeads] = await pool.execute(
    'SELECT COUNT(*) as total FROM leads WHERE assigned_to = ?',
    [userId]
  );
  const [myClients] = await pool.execute(
    'SELECT COUNT(*) as total FROM clients WHERE assigned_to = ?',
    [userId]
  );

  // Today's follow-ups
  const [todayFollowUps] = await pool.execute(
    `SELECT f.*, l.name as lead_name, l.phone as lead_phone,
            cl.name as client_name, cl.phone as client_phone
     FROM follow_ups f
     LEFT JOIN leads l ON f.lead_id = l.id
     LEFT JOIN clients cl ON f.client_id = cl.id
     WHERE f.assigned_to = ? AND DATE(f.followup_date) = CURDATE() AND f.status = 'pending'
     ORDER BY f.followup_date ASC`,
    [userId]
  );

  // Today's task reminders
  const [todayReminders] = await pool.execute(
    `SELECT id, title, due_date, reminder_at, priority, status
     FROM tasks
     WHERE assigned_to = ? AND DATE(reminder_at) = CURDATE() AND status != 'completed'
     ORDER BY reminder_at ASC`,
    [userId]
  );

  // My activities summary
  const [myActivities] = await pool.execute(
    `SELECT type, COUNT(*) as count, SUM(points) as total_points
     FROM employee_activities
     WHERE employee_id = ?
     GROUP BY type`,
    [userId]
  );

  // Recent point entries
  const [recentPoints] = await pool.execute(
    `SELECT points, reason, created_at
     FROM points_ledger
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );

  const totalT = myTasks[0].total;
  const completedT = myCompleted[0].total;

  res.json({
    success: true,
    data: {
      tasks: {
        total: totalT,
        completed: completedT,
        pending: myPending[0].total,
        overdue: myOverdue[0].total,
        completion_rate: totalT > 0 ? Math.round((completedT / totalT) * 100) : 0,
      },
      points: {
        total: myPoints[0].total,
        recent: recentPoints,
      },
      leads: myLeads[0].total,
      clients: myClients[0].total,
      today_followups: todayFollowUps,
      today_reminders: todayReminders,
      activities: myActivities,
    },
  });
});

// ─── CLIENT DASHBOARD ───
const clientDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  // Find client record linked to this user (by email)
  const [userInfo] = await pool.execute('SELECT email FROM users WHERE id = ?', [userId]);
  const email = userInfo.length > 0 ? userInfo[0].email : null;

  let clientData = null;
  let tasks = [];
  let followUps = [];

  if (email) {
    const [clients] = await pool.execute(
      'SELECT * FROM clients WHERE email = ? LIMIT 1',
      [email]
    );
    if (clients.length > 0) {
      clientData = clients[0];

      // Tasks related to this client (if any — through notes or direct)
      // Follow-ups for this client
      const [fups] = await pool.execute(
        `SELECT f.id, f.followup_date, f.note, f.status, u.name as assigned_to_name
         FROM follow_ups f
         LEFT JOIN users u ON f.assigned_to = u.id
         WHERE f.client_id = ?
         ORDER BY f.followup_date DESC
         LIMIT 10`,
        [clientData.id]
      );
      followUps = fups;
    }
  }

  // Notifications for this user
  const [notifications] = await pool.execute(
    `SELECT id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = ? AND is_read = 0
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      client: clientData
        ? { name: clientData.name, email: clientData.email, phone: clientData.phone, company: clientData.company, status: clientData.status }
        : null,
      follow_ups: followUps,
      notifications,
    },
  });
});

// ─── BRANCH DASHBOARD ───
const branchDashboard = asyncHandler(async (req, res) => {
  const bf = await getBranchFilter(req.user, 'b');

  const [branches] = await pool.execute(
    `SELECT
       b.id, b.name,
       (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'employee' AND u.is_active = 1 AND u.branch_id = b.id) as total_employees,
       (SELECT COUNT(*) FROM leads l WHERE l.branch_id = b.id) as total_leads,
       (SELECT COUNT(*) FROM clients c WHERE c.branch_id = b.id) as total_clients,
       (SELECT COUNT(*) FROM tasks t WHERE t.branch_id = b.id) as total_tasks,
       (SELECT COUNT(*) FROM tasks t WHERE t.branch_id = b.id AND t.status = 'completed') as completed_tasks,
       (SELECT COALESCE(SUM(pl.points), 0) FROM points_ledger pl WHERE pl.branch_id = b.id) as total_points,
       (SELECT COUNT(*) FROM employee_activities ea WHERE ea.branch_id = b.id AND ea.type = 'call') as total_calls,
       (SELECT COUNT(*) FROM employee_activities ea WHERE ea.branch_id = b.id AND ea.type = 'visit') as total_visits
     FROM branches b
     WHERE b.is_active = 1 ${bf.clause}
     ORDER BY total_points DESC`,
    bf.params
  );

  // Add computed fields
  const data = branches.map((b) => ({
    ...b,
    task_completion_rate: b.total_tasks > 0 ? Math.round((b.completed_tasks / b.total_tasks) * 100) : 0,
  }));

  res.json({ success: true, data });
});

// ─── EMPLOYEE PERFORMANCE DASHBOARD ───
const employeePerformance = asyncHandler(async (req, res) => {
  const { branch_id, sort_by = 'total_points', sort_order = 'DESC', page = 1, limit = 50 } = req.query;
  const bf = await getBranchFilter(req.user, 'u');

  let branchFilter = '';
  const branchParams = [];
  if (branch_id) {
    branchFilter = ' AND u.branch_id = ?';
    branchParams.push(parseInt(branch_id, 10));
  }

  const [employees] = await pool.execute(
    `SELECT
       u.id, u.name, u.email, u.branch_id, b.name as branch_name,
       (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id) as total_tasks,
       (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status = 'completed') as completed_tasks,
       (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status IN ('pending','in_progress')) as pending_tasks,
       (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status != 'completed' AND t.due_date < CURDATE()) as overdue_tasks,
       (SELECT COALESCE(SUM(pl.points), 0) FROM points_ledger pl WHERE pl.user_id = u.id) as total_points,
       (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id) as total_leads,
       (SELECT COUNT(*) FROM clients c WHERE c.assigned_to = u.id) as total_clients,
       (SELECT COUNT(*) FROM employee_activities ea WHERE ea.employee_id = u.id AND ea.type = 'call') as total_calls,
       (SELECT COUNT(*) FROM employee_activities ea WHERE ea.employee_id = u.id AND ea.type = 'visit') as total_visits
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE r.name = 'employee' AND u.is_active = 1
       ${bf.clause}${branchFilter}
     ORDER BY ${getSafeEmployeeSort(sort_by)} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [...bf.params, ...branchParams, Math.min(100, Math.max(1, parseInt(limit, 10))), (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)]
  );

  // Add computed fields
  const data = employees.map((e) => ({
    ...e,
    task_completion_rate: e.total_tasks > 0 ? Math.round((e.completed_tasks / e.total_tasks) * 100) : 0,
  }));

  res.json({ success: true, data });
});

// Safe sort column helper
function getSafeEmployeeSort(sortBy) {
  const allowed = {
    total_points: 'total_points',
    total_tasks: 'total_tasks',
    completed_tasks: 'completed_tasks',
    pending_tasks: 'pending_tasks',
    total_leads: 'total_leads',
    name: 'u.name',
  };
  return allowed[sortBy] || 'total_points';
}

module.exports = {
  adminDashboard,
  subAdminDashboard,
  employeeDashboard,
  clientDashboard,
  branchDashboard,
  employeePerformance,
};
