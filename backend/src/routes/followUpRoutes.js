const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createFollowUp,
  getAllFollowUps,
  getFollowUpById,
  updateFollowUp,
  deleteFollowUp,
  getTodayFollowUps,
} = require('../controllers/followUpController');

router.use(authenticate);

// Today's follow-ups (before /:id)
router.get('/today', checkPermission('view_followups'), getTodayFollowUps);

// CRUD
router.get('/', checkPermission('view_followups'), getAllFollowUps);
router.get('/:id', checkPermission('view_followups'), getFollowUpById);
router.post('/', checkPermission('create_followups'), createFollowUp);
router.put('/:id', checkPermission('edit_followups'), updateFollowUp);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_followups'), deleteFollowUp);

module.exports = router;
