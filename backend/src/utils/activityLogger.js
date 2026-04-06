const { pool } = require('../database/connection');
const logger = require('./logger');

const activityLogger = async (userId, action, module, referenceId, details, ip, branchId) => {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, action, module, reference_id, details, ip_address, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, module, referenceId || null, JSON.stringify(details || {}), ip || null, branchId || null]
    );
  } catch (error) {
    // Don't throw — activity logging should never break the main flow
    logger.error('Activity log error:', error.message);
  }
};

module.exports = activityLogger;
