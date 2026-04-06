const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { getBranchFilter } = require('../middleware/branchFilterMiddleware');

// ─── CREATE NOTE ───
const createNote = asyncHandler(async (req, res, next) => {
  const { notable_type, notable_id, content } = req.body;

  if (!notable_type || !notable_id || !content) {
    return next(new AppError('notable_type, notable_id, and content are required', 400));
  }

  const validTypes = ['task', 'lead', 'client'];
  if (!validTypes.includes(notable_type)) {
    return next(new AppError('notable_type must be one of: task, lead, client', 400));
  }

  // Verify the entity exists and user has branch access
  let entityTable, entityBranch;
  if (notable_type === 'task') {
    entityTable = 'tasks';
  } else if (notable_type === 'lead') {
    entityTable = 'leads';
  } else {
    entityTable = 'clients';
  }

  const [entity] = await pool.execute(
    `SELECT id, branch_id FROM ${entityTable} WHERE id = ?`,
    [notable_id]
  );
  if (entity.length === 0) {
    return next(new AppError(`${notable_type} not found`, 404));
  }
  entityBranch = entity[0].branch_id;

  // Branch access check
  if (req.user.role !== 'admin') {
    const branchFilter = await getBranchFilter(req.user);
    if (branchFilter.clause) {
      const [check] = await pool.execute(
        `SELECT id FROM branches WHERE id = ? ${branchFilter.clause}`,
        [entityBranch, ...branchFilter.params]
      );
      if (check.length === 0) {
        return next(new AppError('You do not have access to this record', 403));
      }
    }
  }

  const [result] = await pool.execute(
    `INSERT INTO notes (notable_type, notable_id, content, created_by, branch_id)
     VALUES (?, ?, ?, ?, ?)`,
    [notable_type, notable_id, content, req.user.user_id, entityBranch]
  );

  await activityLogger(
    req.user.user_id, 'create', 'notes', result.insertId,
    { notable_type, notable_id }, req.ip, entityBranch
  );

  const [created] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    data: created[0],
  });
});

// ─── GET NOTES FOR AN ENTITY ───
const getNotes = asyncHandler(async (req, res) => {
  const { notable_type, notable_id } = req.query;

  if (!notable_type || !notable_id) {
    return res.status(400).json({
      success: false,
      message: 'notable_type and notable_id are required',
    });
  }

  const branchFilter = await getBranchFilter(req.user, 'n');

  const [notes] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.notable_type = ? AND n.notable_id = ?
       ${branchFilter.clause}
     ORDER BY n.created_at DESC`,
    [notable_type, parseInt(notable_id, 10), ...branchFilter.params]
  );

  res.json({ success: true, data: notes });
});

// ─── GET NOTE BY ID ───
const getNoteById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'n');

  const [notes] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );

  if (notes.length === 0) {
    return next(new AppError('Note not found or access denied', 404));
  }

  res.json({ success: true, data: notes[0] });
});

// ─── UPDATE NOTE ───
const updateNote = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return next(new AppError('content is required', 400));
  }

  const branchFilter = await getBranchFilter(req.user, 'n');

  const [existing] = await pool.execute(
    `SELECT n.* FROM notes n WHERE n.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Note not found or access denied', 404));
  }

  const note = existing[0];

  // Only the creator or admin can edit
  if (req.user.role !== 'admin' && note.created_by !== req.user.user_id) {
    return next(new AppError('You can only edit your own notes', 403));
  }

  await pool.execute('UPDATE notes SET content = ? WHERE id = ?', [content, id]);

  await activityLogger(
    req.user.user_id, 'update', 'notes', parseInt(id, 10),
    { content }, req.ip, note.branch_id
  );

  const [updated] = await pool.execute(
    `SELECT n.*, u.name as created_by_name
     FROM notes n LEFT JOIN users u ON n.created_by = u.id WHERE n.id = ?`,
    [id]
  );

  res.json({ success: true, message: 'Note updated successfully', data: updated[0] });
});

// ─── DELETE NOTE ───
const deleteNote = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const branchFilter = await getBranchFilter(req.user, 'n');

  const [existing] = await pool.execute(
    `SELECT n.* FROM notes n WHERE n.id = ? ${branchFilter.clause}`,
    [id, ...branchFilter.params]
  );
  if (existing.length === 0) {
    return next(new AppError('Note not found or access denied', 404));
  }

  const note = existing[0];

  // Only creator or admin can delete
  if (req.user.role !== 'admin' && note.created_by !== req.user.user_id) {
    return next(new AppError('You can only delete your own notes', 403));
  }

  await pool.execute('DELETE FROM notes WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'notes', parseInt(id, 10),
    {}, req.ip, note.branch_id
  );

  res.json({ success: true, message: 'Note deleted successfully' });
});

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
