const { pool } = require('../database/connection');

/**
 * Builds a branch filter clause for SQL queries based on user role.
 * Returns { clause: string, params: array } to append to WHERE.
 *
 * Admin:      no filter (full access)
 * Sub-admin:  WHERE branch_id IN (assigned branches)
 * Employee:   WHERE branch_id = user.branch_id
 * Client:     WHERE branch_id = user.branch_id
 *
 * Usage:
 *   const { clause, params } = await getBranchFilter(req.user, 'tablealias');
 *   const query = `SELECT * FROM leads ${clause}`;
 *   const [rows] = await pool.execute(query, params);
 */
async function getBranchFilter(user, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  // Admin: no restriction
  if (user.role === 'admin') {
    return { clause: '', params: [] };
  }

  // Sub-admin: fetch assigned branches fresh from DB
  if (user.role === 'sub_admin') {
    const [access] = await pool.execute(
      'SELECT branch_id FROM user_branch_access WHERE user_id = ?',
      [user.user_id]
    );
    const branchIds = access.map((a) => a.branch_id);
    if (user.branch_id) branchIds.push(user.branch_id);

    // Deduplicate
    const uniqueIds = [...new Set(branchIds)];

    if (uniqueIds.length === 0) {
      // No branch access — return impossible condition
      return { clause: `AND ${prefix}branch_id = -1`, params: [] };
    }

    const placeholders = uniqueIds.map(() => '?').join(',');
    return {
      clause: `AND ${prefix}branch_id IN (${placeholders})`,
      params: uniqueIds,
    };
  }

  // Employee / Client: own branch only
  if (user.branch_id) {
    return {
      clause: `AND ${prefix}branch_id = ?`,
      params: [user.branch_id],
    };
  }

  // No branch assigned — show nothing
  return { clause: `AND ${prefix}branch_id = -1`, params: [] };
}

/**
 * Express middleware version: attaches branchFilter to req for use in controllers.
 */
const attachBranchFilter = async (req, res, next) => {
  try {
    req.branchFilter = await getBranchFilter(req.user);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { getBranchFilter, attachBranchFilter };
