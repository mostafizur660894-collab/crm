const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { addSheet, getAllSheets, getSheetById, deleteSheet, liveView } = require('../controllers/sheetController');
const { importFromSheet, getImportLogs } = require('../controllers/importController');

// All sheet routes require authentication
router.use(authenticate);

// Sheet CRUD — admin only
router.post('/', restrictTo('admin'), addSheet);
router.get('/', restrictTo('admin'), checkPermission('view_sheets'), getAllSheets);
router.get('/import-logs', restrictTo('admin'), checkPermission('view_sheets'), getImportLogs);
router.get('/:id', restrictTo('admin'), checkPermission('view_sheets'), getSheetById);
router.get('/:id/live', restrictTo('admin'), checkPermission('view_sheets'), liveView);
router.delete('/:id', restrictTo('admin'), deleteSheet);

// Import from sheet — admin only
router.post('/:id/import', restrictTo('admin'), importFromSheet);

module.exports = router;
