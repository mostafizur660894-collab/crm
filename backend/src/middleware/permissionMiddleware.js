const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');

// Permissions that super sub-admins are NOT allowed to use
const SUPER_SUB_ADMIN_RESTRICTED = ['delete_client', 'delete_employee', 'delete_branch'];

/**
 * Checks if the authenticated user has a specific permission.
 * Admin role bypasses all permission checks.
 * Super sub-admin (is_super=1) bypasses most checks EXCEPT restricted actions.
 *
 * Usage: router.get('/users', authenticate, checkPermission('view_users'), controller)
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Admin bypasses all permission checks
      if (req.user.role === 'admin') {
        return next();
      }

      // Super sub-admin: allow everything EXCEPT restricted actions
      if (req.user.role === 'sub_admin' && req.user.is_super) {
        const permsToCheck = typeof requiredPermission === 'string'
          ? [requiredPermission]
          : requiredPermission;

        const blocked = permsToCheck.some((p) => SUPER_SUB_ADMIN_RESTRICTED.includes(p));
        if (blocked) {
          return next(
            new AppError('Super sub-admins cannot perform critical delete operations.', 403)
          );
        }
        return next();
      }

      // Fetch user's permissions from DB (always fresh from DB, never trust token alone)
      const [permissions] = await pool.execute(
        `SELECT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?`,
        [req.user.role_id]
      );

      const userPermissions = permissions.map((p) => p.name);

      // Check single permission
      if (typeof requiredPermission === 'string') {
        if (!userPermissions.includes(requiredPermission)) {
          return next(
            new AppError('You do not have permission to perform this action.', 403)
          );
        }
        return next();
      }

      // Check multiple permissions (ANY match)
      if (Array.isArray(requiredPermission)) {
        const hasAny = requiredPermission.some((perm) =>
          userPermissions.includes(perm)
        );
        if (!hasAny) {
          return next(
            new AppError('You do not have permission to perform this action.', 403)
          );
        }
        return next();
      }

      return next(new AppError('Invalid permission configuration.', 500));
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Checks if user has ALL the specified permissions.
 *
 * Usage: router.post('/import', authenticate, checkAllPermissions(['view_sheets', 'import_sheets']), controller)
 */
const checkAllPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Admin bypasses all
      if (req.user.role === 'admin') {
        return next();
      }

      // Super sub-admin: allow everything EXCEPT restricted actions
      if (req.user.role === 'sub_admin' && req.user.is_super) {
        const blocked = requiredPermissions.some((p) => SUPER_SUB_ADMIN_RESTRICTED.includes(p));
        if (blocked) {
          return next(
            new AppError('Super sub-admins cannot perform critical delete operations.', 403)
          );
        }
        return next();
      }

      const [permissions] = await pool.execute(
        `SELECT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?`,
        [req.user.role_id]
      );

      const userPermissions = permissions.map((p) => p.name);

      const hasAll = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasAll) {
        return next(
          new AppError('You do not have all required permissions for this action.', 403)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPermission, checkAllPermissions };
