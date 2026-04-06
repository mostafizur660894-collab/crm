const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
} = require('../controllers/taskController');

router.use(authenticate);

// Stats (before /:id)
router.get('/stats', checkPermission('view_tasks'), getTaskStats);

// CRUD
router.get('/', checkPermission('view_tasks'), getAllTasks);
router.get('/:id', checkPermission('view_tasks'), getTaskById);
router.post('/', checkPermission('create_tasks'), createTask);
router.put('/:id', checkPermission('edit_tasks'), updateTask);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_tasks'), deleteTask);

module.exports = router;
