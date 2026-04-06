const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createActivity,
  getAllActivities,
  getActivityStats,
  getActivityById,
} = require('../controllers/activityController');

router.use(authenticate);

// Stats (before /:id)
router.get('/stats', checkPermission('view_leads'), getActivityStats);

// CRUD
router.get('/', checkPermission('view_leads'), getAllActivities);
router.get('/:id', checkPermission('view_leads'), getActivityById);
router.post('/', restrictTo('admin', 'sub_admin'), createActivity);

module.exports = router;
