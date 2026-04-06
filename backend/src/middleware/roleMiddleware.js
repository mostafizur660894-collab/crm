const AppError = require('../utils/AppError');

/**
 * Restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 * Super sub-admin (is_super=1) is treated as having admin-level route access.
 *
 * Usage: router.get('/admin-only', authenticate, restrictTo('admin'), controller)
 *        router.get('/managers', authenticate, restrictTo('admin', 'sub_admin'), controller)
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required.', 401));
    }

    // Super sub-admin passes role gates that include 'admin' or 'sub_admin'
    if (req.user.role === 'sub_admin' && req.user.is_super) {
      if (allowedRoles.includes('admin') || allowedRoles.includes('sub_admin')) {
        return next();
      }
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to access this resource.', 403)
      );
    }

    next();
  };
};

/**
 * Ensures user can only access data from their own branch.
 * Admin bypasses this check.
 * Sub-admin can access their assigned branches.
 *
 * Reads branch_id from req.params.branchId, req.query.branch_id, or req.body.branch_id
 */
const branchGuard = (req, res, next) => {
  // Admin and super sub-admin can access all branches
  if (req.user.role === 'admin' || (req.user.role === 'sub_admin' && req.user.is_super)) {
    return next();
  }

  const requestedBranchId = parseInt(
    req.params.branchId || req.query.branch_id || req.body.branch_id,
    10
  );

  if (!requestedBranchId) {
    // If no branch specified, restrict to user's own branch by setting it
    if (req.user.branch_id) {
      req.query.branch_id = req.user.branch_id;
    }
    return next();
  }

  // Sub-admin: check branch_access list
  if (req.user.role === 'sub_admin') {
    const hasAccess =
      req.user.branch_access.includes(requestedBranchId) ||
      req.user.branch_id === requestedBranchId;

    if (!hasAccess) {
      return next(
        new AppError('You do not have access to this branch.', 403)
      );
    }
    return next();
  }

  // Employee/Client: can only access own branch
  if (req.user.branch_id !== requestedBranchId) {
    return next(
      new AppError('You do not have access to this branch.', 403)
    );
  }

  next();
};

module.exports = { restrictTo, branchGuard };
