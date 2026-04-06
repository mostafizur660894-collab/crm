const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignBranchAccess,
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  getAllPermissions,
} = require('../controllers/userController');

// All user routes require authentication
router.use(authenticate);

// ─── ROLES & PERMISSIONS (admin only) ───
router.get('/roles', restrictTo('admin', 'sub_admin'), getRoles);
router.get('/permissions', restrictTo('admin'), getAllPermissions);
router.get('/roles/:id/permissions', restrictTo('admin'), getRolePermissions);
router.put('/roles/:id/permissions', restrictTo('admin'), updateRolePermissions);

// ─── USER CRUD ───
router.get('/', checkPermission('view_users'), getAllUsers);
router.get('/:id', checkPermission('view_users'), getUserById);
router.post('/', restrictTo('admin', 'sub_admin'), checkPermission('create_users'), createUser);
router.put('/:id', restrictTo('admin', 'sub_admin'), checkPermission('edit_users'), updateUser);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_employee'), deleteUser);

// ─── BRANCH ACCESS ───
router.put('/:id/branch-access', restrictTo('admin', 'sub_admin'), assignBranchAccess);

module.exports = router;
