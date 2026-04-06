const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  convertLeadToClient,
  assignLead,
  getLeadStats,
} = require('../controllers/leadController');

// All lead routes require authentication
router.use(authenticate);

// Stats (before /:id to prevent route conflict)
router.get('/stats', checkPermission('view_leads'), getLeadStats);

// CRUD
router.get('/', checkPermission('view_leads'), getAllLeads);
router.get('/:id', checkPermission('view_leads'), getLeadById);
router.post('/', checkPermission('create_leads'), createLead);
router.put('/:id', checkPermission('edit_leads'), updateLead);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_leads'), deleteLead);

// Lead conversion
router.post('/:id/convert', checkPermission('convert_leads'), convertLeadToClient);

// Lead assignment
router.put('/:id/assign', restrictTo('admin', 'sub_admin'), checkPermission('edit_leads'), assignLead);

module.exports = router;
