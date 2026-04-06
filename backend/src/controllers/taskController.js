const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');
const { createNotification } = require('../utils/notificationHelper');

// ─── CREATE TASK ───
const createTask = asyncHandler(async (req, res, next) => {
  const {
    title, description, assigned_to, category_id, branch_id,
    due_date, reminder_at, points, priority,
  } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError('Task title is required', 400));
  }
  if (!assigned_to) {
    return next(new AppError('assigned_to (employee ID) is required', 400));
  }

  // Determine branch
  let targetBranch = branch_id;
  if (req.user.role === 'employee') {
    targetBranch = req.user.branch_id;
  } else if (req.user.role === 'sub_admin' && !targetBranch) {
    targetBranch = req.user.branch_id;
  }

  if (!targetBranch) {
    return next(new AppError('branch_id is required', 400));
  }

  // Branch access check for sub-admin
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

  // Verify branch exists
  const [branchCheck] = await pool.execute(
    'SELECT id FROM branches WHERE id = ? AND is_active = 1',
    [targetBranch]
  );
  if (branchCheck.length === 0) {
    return next(new AppError('Invalid or inactive branch', 400));
  }

  // Verify assigned employee exists in branch
  const [emp] = await pool.execute(
    'SELECT id, name FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
    [assigned_to, targetBranch]
  );
  if (emp.length === 0) {
    return next(new AppError('Assigned employee not found in this branch', 400));
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

  // Validate priority
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const taskPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

  // Validate points
  const taskPoints = points && Number.isInteger(Number(points)) && Number(points) >= 0
    ? Number(points) : 0;

  const [result] = await pool.execute(
    `INSERT INTO tasks (title, description, assigned_to, assigned_by, category_id, branch_id,
      due_date, reminder_at, points, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      description || null,
      assigned_to,
      req.user.user_id,
      category_id || null,
      targetBranch,
      due_date || null,
      reminder_at || null,
      taskPoints,
      taskPriority,
    ]
  );

  // Notify the assigned employee
  await createNotification(
    assigned_to,
    'New Task Assigned',
    `You have been assigned a new task: "${title.trim()}"`,
    'task_assigned',
    'task',
    result.insertId
  );

  await activityLogger(
    req.user.user_id, 'create', 'tasks', result.insertId,
    { title: title.trim(), assigned_to, points: taskPoints }, req.ip, targetBranch
  );

  const [created] = await pool.execute(
    `SELECT t.*, c.name as category_name,
            u.name as assigned_to_name, ab.name as assigned_by_name,
            b.name as branch_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN users ab ON t.assigned_by = ab.id
     LEFT JOIN branches b ON t.branch_id = b.id
     WHERE t.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: created[0],
  });
});

// ─── GET ALL TASKS ───
const getAllTasks = asyncHandler(async (req, res) => {
  const {
    search, status, priority, category_id, assigned_to,
    branch_id: filterBranch, due_date_from, due_date_to,
    page = 1, limit = 50, sort_by = 'created_at', sort_order = 'DESC',
  } = req.query;

  const branchFilter = await getBranchFilter(req.user, 't');

  let query = `
    SELECT t.*, c.name as category_name,
           u.name as assigned_to_name, ab.name as assigned_by_name,
           b.name as branch_name
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users ab ON t.assigned_by = ab.id
    LEFT JOIN branches b ON t.branch_id = b.id
    WHERE 1=1 ${branchFilter.clause}
  `;
  let countQuery = `SELECT COUNT(*) as total FROM tasks t WHERE 1=1 ${branchFilter.clause}`;
  const params = [...branchFilter.params];
  const countParams = [...branchFilter.params];

  // Employee: only their assigned tasks
  if (req.user.role === 'employee') {
    query += ' AND t.assigned_to = ?';
    countQuery += ' AND t.assigned_to = ?';
    params.push(req.user.user_id);
    countParams.push(req.user.user_id);
  }

  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    countQuery += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
    countParams.push(s, s);
  }

  if (status) {
    query += ' AND t.status = ?';
    countQuery += ' AND t.status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    countQuery += ' AND t.priority = ?';
    params.push(priority);
    countParams.push(priority);
  }

  if (category_id) {
    query += ' AND t.category_id = ?';
    countQuery += ' AND t.category_id = ?';
    params.push(parseInt(category_id, 10));
    countParams.push(parseInt(category_id, 10));
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    countQuery += ' AND t.assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
    countParams.push(parseInt(assigned_to, 10));
  }

  if (filterBranch) {
    query += ' AND t.branch_id = ?';
    countQuery += ' AND t.branch_id = ?';
    params.push(parseInt(filterBranch, 10));
    countParams.push(parseInt(filterBranch, 10));
  }

  if (due_date_from) {
    query += ' AND t.due_date >= ?';
    countQuery += ' AND t.due_date >= ?';
    params.push(due_date_from);
    countParams.push(due_date_from);
  }
  if (due_date_to) {
    query += ' AND t.due_date <= ?';
    countQuery += ' AND t.due_date <= ?';
    params.push(due_date_to);
    countParams.push(due_date_to);
  }

  const allowedSorts = ['created_at', 'due_date', 'priority', 'status', 'title', 'points'];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY t.${sortCol} ${sortDir}`;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const [tasks] = await pool.execute(query, params);
  const [countResult] = await pool.execute(countQuery, countParams);
  const total = countResult[0].total;

  res.json({
    success: true,
    data: tasks,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─── GET TASK BY ID ───
const getTaskById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 't');

  let query = `
    SELECT t.*, c.name as category_name,
           u.name as assigned_to_name, ab.name as assigned_by_name,
           b.name as branch_name
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users ab ON t.assigned_by = ab.id
    LEFT JOIN branches b ON t.branch_id = b.id
    WHERE t.id = ? ${branchFilter.clause}
  `;
  const params = [id, ...branchFilter.params];

  // Employee can only see their tasks
  if (req.user.role === 'employee') {
    query += ' AND t.assigned_to = ?';
    params.push(req.user.user_id);
  }

  const [tasks] = await pool.execute(query, params);
  if (tasks.length === 0) {
    return next(new AppError('Task not found or access denied', 404));
  }

  // Fetch notes
  const [notes] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n LEFT JOIN users u ON n.created_by = u.id
     WHERE n.notable_type = 'task' AND n.notable_id = ?
     ORDER BY n.created_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: { ...tasks[0], notes },
  });
});

// ─── UPDATE TASK ───
const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    title, description, assigned_to, category_id,
    due_date, reminder_at, points, priority, status,
  } = req.body;

  const branchFilter = await getBranchFilter(req.user, 't');

  // Fetch existing task
  const [existing] = await pool.execute(
    `SELECT t.* FROM tasks t WHERE t.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Task not found or access denied', 404));
  }

  const task = existing[0];

  // ── EMPLOYEE RESTRICTIONS ──
  if (req.user.role === 'employee') {
    if (task.assigned_to !== req.user.user_id) {
      return next(new AppError('You can only update tasks assigned to you', 403));
    }
    // Employee can ONLY update status
    if (title || description || assigned_to || category_id || due_date || reminder_at || points !== undefined || priority) {
      return next(new AppError('You can only update the status of your tasks', 403));
    }
    if (!status) {
      return next(new AppError('Provide a status to update', 400));
    }
  }

  // Validate status
  if (status) {
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid task status', 400));
    }
  }

  // Validate priority
  if (priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return next(new AppError('Invalid priority', 400));
    }
  }

  // Validate assigned_to
  if (assigned_to) {
    const [emp] = await pool.execute(
      'SELECT id, name FROM users WHERE id = ? AND is_active = 1 AND branch_id = ?',
      [assigned_to, task.branch_id]
    );
    if (emp.length === 0) {
      return next(new AppError('Assigned employee not found in this branch', 400));
    }
  }

  // Validate category
  if (category_id) {
    const [cat] = await pool.execute(
      'SELECT id FROM categories WHERE id = ? AND is_active = 1', [category_id]
    );
    if (cat.length === 0) {
      return next(new AppError('Invalid or inactive category', 400));
    }
  }

  // Handle completed_at
  let completedAt = task.completed_at;
  if (status === 'completed' && task.status !== 'completed') {
    completedAt = new Date();

    // Award points via points_ledger
    if (task.points > 0) {
      await pool.execute(
        `INSERT INTO points_ledger (user_id, task_id, points, reason, branch_id)
         VALUES (?, ?, ?, ?, ?)`,
        [task.assigned_to, task.id, task.points, `Completed task: ${task.title}`, task.branch_id]
      );
    }

    // Notify assigner that task is complete
    await createNotification(
      task.assigned_by,
      'Task Completed',
      `Task "${task.title}" has been marked as completed.`,
      'task_completed',
      'task',
      task.id
    );
  } else if (status && status !== 'completed') {
    completedAt = null;
  }

  // Validate points (non-employee only)
  const taskPoints = points !== undefined && Number.isInteger(Number(points)) && Number(points) >= 0
    ? Number(points) : null;

  await pool.execute(
    `UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assigned_to = COALESCE(?, assigned_to),
      category_id = COALESCE(?, category_id),
      due_date = COALESCE(?, due_date),
      reminder_at = COALESCE(?, reminder_at),
      points = COALESCE(?, points),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      completed_at = ?
     WHERE id = ?`,
    [
      title ? title.trim() : null,
      description !== undefined ? description : null,
      assigned_to || null,
      category_id || null,
      due_date || null,
      reminder_at || null,
      taskPoints,
      priority || null,
      status || null,
      completedAt,
      id,
    ]
  );

  // Notify if reassigned
  if (assigned_to && assigned_to !== task.assigned_to) {
    await createNotification(
      assigned_to,
      'Task Reassigned To You',
      `You have been assigned the task: "${task.title}"`,
      'task_assigned',
      'task',
      task.id
    );
  }

  await activityLogger(
    req.user.user_id, 'update', 'tasks', parseInt(id, 10),
    req.body, req.ip, task.branch_id
  );

  const [updated] = await pool.execute(
    `SELECT t.*, c.name as category_name,
            u.name as assigned_to_name, ab.name as assigned_by_name,
            b.name as branch_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN users ab ON t.assigned_by = ab.id
     LEFT JOIN branches b ON t.branch_id = b.id
     WHERE t.id = ?`,
    [id]
  );

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: updated[0],
  });
});

// ─── DELETE TASK ───
const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 't');

  const [existing] = await pool.execute(
    `SELECT t.id, t.title FROM tasks t WHERE t.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Task not found or access denied', 404));
  }

  // Clean up related records
  await pool.execute("DELETE FROM notes WHERE notable_type = 'task' AND notable_id = ?", [id]);
  await pool.execute('DELETE FROM requests WHERE task_id = ?', [id]);
  await pool.execute('DELETE FROM points_ledger WHERE task_id = ?', [id]);

  await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'tasks', parseInt(id, 10),
    { title: existing[0].title }, req.ip, req.user.branch_id
  );

  res.json({ success: true, message: 'Task deleted successfully' });
});

// ─── GET TASK STATS ───
const getTaskStats = asyncHandler(async (req, res) => {
  const branchFilter = await getBranchFilter(req.user, 't');

  let extraFilter = '';
  const extraParams = [];
  if (req.user.role === 'employee') {
    extraFilter = ' AND t.assigned_to = ?';
    extraParams.push(req.user.user_id);
  }

  const [stats] = await pool.execute(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
       SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
       SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
       SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
       SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) as overdue_count
     FROM tasks t
     WHERE 1=1 ${branchFilter.clause}${extraFilter}`,
    [...branchFilter.params, ...extraParams]
  );

  res.json({ success: true, data: stats[0] });
});

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
};
