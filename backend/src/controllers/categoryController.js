const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');

// ─── CREATE CATEGORY ───
const createCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Category name is required', 400));
  }

  const trimmedName = name.trim();

  // Check duplicate
  const [existing] = await pool.execute(
    'SELECT id FROM categories WHERE name = ?',
    [trimmedName]
  );
  if (existing.length > 0) {
    return next(new AppError('A category with this name already exists', 409));
  }

  const [result] = await pool.execute(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [trimmedName, description || null]
  );

  await activityLogger(
    req.user.user_id, 'create', 'categories', result.insertId,
    { name: trimmedName }, req.ip, req.user.branch_id
  );

  const [created] = await pool.execute(
    'SELECT * FROM categories WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: created[0],
  });
});

// ─── GET ALL CATEGORIES ───
const getAllCategories = asyncHandler(async (req, res) => {
  const { search, status } = req.query;

  let query = `
    SELECT
      categories.*,
      COUNT(tasks.id) AS task_total,
      SUM(CASE WHEN tasks.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
      MIN(CASE WHEN tasks.status IN ('pending', 'in_progress') THEN tasks.due_date END) AS next_deadline,
      COALESCE((
        SELECT users.name
        FROM tasks AS task_assignment
        LEFT JOIN users ON users.id = task_assignment.assigned_to
        WHERE task_assignment.category_id = categories.id
        ORDER BY
          CASE WHEN task_assignment.status = 'completed' THEN 1 ELSE 0 END,
          task_assignment.due_date IS NULL,
          task_assignment.due_date ASC,
          task_assignment.created_at DESC
        LIMIT 1
      ), 'Unassigned') AS assigned_user_name
    FROM categories
    LEFT JOIN tasks ON tasks.category_id = categories.id
    WHERE 1=1`;
  const params = [];

  if (status !== undefined) {
    const isActive = status === 'active' ? 1 : 0;
    query += ' AND categories.is_active = ?';
    params.push(isActive);
  } else {
    query += ' AND categories.is_active = 1';
  }

  if (search) {
    query += ' AND categories.name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' GROUP BY categories.id ORDER BY categories.name ASC';

  const [categories] = await pool.execute(query, params);

  res.json({
    success: true,
    data: categories,
  });
});

// ─── GET CATEGORY BY ID ───
const getCategoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [categories] = await pool.execute(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );

  if (categories.length === 0) {
    return next(new AppError('Category not found', 404));
  }

  res.json({
    success: true,
    data: categories[0],
  });
});

// ─── UPDATE CATEGORY ───
const updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;

  const [existing] = await pool.execute(
    'SELECT id FROM categories WHERE id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('Category not found', 404));
  }

  // Check duplicate name if changing
  if (name) {
    const trimmedName = name.trim();
    const [dupe] = await pool.execute(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [trimmedName, id]
    );
    if (dupe.length > 0) {
      return next(new AppError('Another category with this name already exists', 409));
    }
  }

  await pool.execute(
    `UPDATE categories SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [name ? name.trim() : null, description !== undefined ? description : null, is_active !== undefined ? is_active : null, id]
  );

  await activityLogger(
    req.user.user_id, 'update', 'categories', parseInt(id, 10),
    req.body, req.ip, req.user.branch_id
  );

  const [updated] = await pool.execute(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: updated[0],
  });
});

// ─── DELETE CATEGORY (soft) ───
const deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    'SELECT id, name FROM categories WHERE id = ?',
    [id]
  );
  if (existing.length === 0) {
    return next(new AppError('Category not found', 404));
  }

  // Check usage in leads/clients/tasks
  const [leadCount] = await pool.execute(
    'SELECT COUNT(*) as count FROM leads WHERE category_id = ?', [id]
  );
  const [clientCount] = await pool.execute(
    'SELECT COUNT(*) as count FROM clients WHERE category_id = ?', [id]
  );
  const [taskCount] = await pool.execute(
    'SELECT COUNT(*) as count FROM tasks WHERE category_id = ?', [id]
  );

  const totalUsage = leadCount[0].count + clientCount[0].count + taskCount[0].count;

  if (totalUsage > 0) {
    // Soft-delete instead of hard delete
    await pool.execute('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);

    await activityLogger(
      req.user.user_id, 'deactivate', 'categories', parseInt(id, 10),
      { name: existing[0].name, usage: totalUsage }, req.ip, req.user.branch_id
    );

    return res.json({
      success: true,
      message: `Category deactivated (used in ${totalUsage} record(s))`,
    });
  }

  // Hard delete if unused
  await pool.execute('DELETE FROM categories WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'categories', parseInt(id, 10),
    { name: existing[0].name }, req.ip, req.user.branch_id
  );

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
