const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');

router.use(authenticate);

// Get notes for an entity (query: ?notable_type=lead&notable_id=5)
router.get('/', checkPermission('view_notes'), getNotes);
router.get('/:id', checkPermission('view_notes'), getNoteById);
router.post('/', checkPermission('create_notes'), createNote);
router.put('/:id', checkPermission('create_notes'), updateNote);
router.delete('/:id', checkPermission('delete_notes'), deleteNote);

module.exports = router;
