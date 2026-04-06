const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchEmployees,
} = require('../controllers/branchController');

// All branch routes require authentication
router.use(authenticate);

// View branches (all authenticated users with permission)
router.get('/', checkPermission('view_branches'), getAllBranches);
router.get('/:id', checkPermission('view_branches'), getBranchById);
router.get('/:id/employees', checkPermission('view_branches'), getBranchEmployees);

// Admin/super sub-admin: create, update; delete is restricted
router.post('/', restrictTo('admin', 'sub_admin'), checkPermission('create_branches'), createBranch);
router.put('/:id', restrictTo('admin', 'sub_admin'), checkPermission('edit_branches'), updateBranch);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_branch'), deleteBranch);

module.exports = router;
