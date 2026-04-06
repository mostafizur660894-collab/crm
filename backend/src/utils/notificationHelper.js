const { pool } = require('../database/connection');
const logger = require('./logger');

/**
 * Create a notification for a user.
 * @param {number} userId - Target user id
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {string} type - e.g. 'task_assigned', 'followup_reminder', 'request_update', 'sheet_import'
 * @param {string} referenceType - e.g. 'task', 'followup', 'request', 'sheet'
 * @param {number|null} referenceId - ID of the referenced entity
 */
async function createNotification(userId, title, message, type, referenceType, referenceId) {
  try {
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message || null, type || null, referenceType || null, referenceId || null]
    );
  } catch (error) {
    // Never break main flow due to notification failure
    logger.error('Notification creation error:', error.message);
  }
}

/**
 * Create notifications for multiple users at once.
 */
async function createBulkNotifications(userIds, title, message, type, referenceType, referenceId) {
  for (const userId of userIds) {
    await createNotification(userId, title, message, type, referenceType, referenceId);
  }
}

module.exports = { createNotification, createBulkNotifications };
