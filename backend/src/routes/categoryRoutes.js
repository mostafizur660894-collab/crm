const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// All category routes require authentication
router.use(authenticate);

// View categories (all authenticated users)
router.get('/', checkPermission('view_categories'), getAllCategories);
router.get('/:id', checkPermission('view_categories'), getCategoryById);

// Admin/Sub-admin: create, update, delete
router.post('/', restrictTo('admin', 'sub_admin'), checkPermission('create_categories'), createCategory);
router.put('/:id', restrictTo('admin', 'sub_admin'), checkPermission('edit_categories'), updateCategory);
router.delete('/:id', restrictTo('admin'), checkPermission('delete_categories'), deleteCategory);

module.exports = router;
