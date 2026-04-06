const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  assignClient,
  getClientStats,
} = require('../controllers/clientController');

// All client routes require authentication
router.use(authenticate);

// Stats (before /:id)
router.get('/stats', checkPermission('view_clients'), getClientStats);

// CRUD
router.get('/', checkPermission('view_clients'), getAllClients);
router.get('/:id', checkPermission('view_clients'), getClientById);
router.post('/', checkPermission('create_clients'), createClient);
router.put('/:id', checkPermission('edit_clients'), updateClient);
router.delete('/:id', restrictTo('admin', 'sub_admin'), checkPermission('delete_client'), deleteClient);

// Assignment
router.put('/:id/assign', restrictTo('admin', 'sub_admin'), checkPermission('edit_clients'), assignClient);

module.exports = router;
