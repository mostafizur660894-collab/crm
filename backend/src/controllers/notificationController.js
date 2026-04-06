const { pool } = require('../database/connection');
const asyncHandler = require('../utils/asyncHandler');

// Get all notifications for current user
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = 'WHERE user_id = ?';
  const params = [req.user.user_id];

  if (unread_only === 'true') {
    whereClause += ' AND is_read = 0';
  }

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    params
  );

  const [notifications] = await pool.execute(
    `SELECT id, title, message, type, reference_type, reference_id, is_read, created_at
     FROM notifications ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const [[{ unread_count }]] = await pool.execute(
    'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.user_id]
  );

  res.json({
    success: true,
    data: notifications,
    unread_count,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, req.user.user_id]
  );

  res.json({ success: true, message: 'Notification marked as read' });
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [req.user.user_id]
  );

  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
