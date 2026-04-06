const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { extractSpreadsheetId, getSpreadsheetTitle, fetchSheetData } = require('../utils/googleSheetsService');

// ─── ADD SHEET ───
const addSheet = asyncHandler(async (req, res, next) => {
  const { sheet_url, sheet_name } = req.body;

  if (!sheet_url) {
    return next(new AppError('sheet_url is required', 400));
  }

  // Validate and extract spreadsheet ID
  const sheetId = extractSpreadsheetId(sheet_url);
  if (!sheetId) {
    return next(new AppError('Invalid Google Sheets URL', 400));
  }

  // Check for duplicate
  const [existing] = await pool.execute(
    'SELECT id FROM google_sheets WHERE sheet_id = ?',
    [sheetId]
  );
  if (existing.length > 0) {
    return next(new AppError('This sheet has already been added', 409));
  }

  // Try to fetch the spreadsheet title from Google to verify access
  let title = sheet_name || null;
  try {
    title = await getSpreadsheetTitle(sheetId);
  } catch (err) {
    return next(
      new AppError(
        'Cannot access this spreadsheet. Make sure the sheet is shared with the service account email.',
        400
      )
    );
  }

  const [result] = await pool.execute(
    `INSERT INTO google_sheets (sheet_url, sheet_id, sheet_name, added_by)
     VALUES (?, ?, ?, ?)`,
    [sheet_url, sheetId, title, req.user.user_id]
  );

  await activityLogger(
    req.user.user_id, 'create', 'sheets', result.insertId,
    { sheet_url, sheet_name: title }, req.ip, null
  );

  const [created] = await pool.execute(
    `SELECT gs.*, u.name as added_by_name
     FROM google_sheets gs
     LEFT JOIN users u ON gs.added_by = u.id
     WHERE gs.id = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: 'Sheet added successfully',
    data: created[0],
  });
});

// ─── GET ALL SHEETS ───
const getAllSheets = asyncHandler(async (req, res) => {
  const [sheets] = await pool.execute(
    `SELECT gs.*, u.name as added_by_name,
       (SELECT COUNT(*) FROM sheet_import_logs sil WHERE sil.sheet_id = gs.id) as import_count,
       (SELECT SUM(sil.rows_imported) FROM sheet_import_logs sil WHERE sil.sheet_id = gs.id) as total_rows_imported
     FROM google_sheets gs
     LEFT JOIN users u ON gs.added_by = u.id
     ORDER BY gs.created_at DESC`
  );

  res.json({ success: true, data: sheets });
});

// ─── GET SHEET BY ID ───
const getSheetById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [sheets] = await pool.execute(
    `SELECT gs.*, u.name as added_by_name
     FROM google_sheets gs
     LEFT JOIN users u ON gs.added_by = u.id
     WHERE gs.id = ?`,
    [id]
  );

  if (sheets.length === 0) {
    return next(new AppError('Sheet not found', 404));
  }

  // Also fetch import history
  const [logs] = await pool.execute(
    `SELECT sil.*, u.name as imported_by_name
     FROM sheet_import_logs sil
     LEFT JOIN users u ON sil.imported_by = u.id
     WHERE sil.sheet_id = ?
     ORDER BY sil.created_at DESC
     LIMIT 20`,
    [id]
  );

  res.json({
    success: true,
    data: { ...sheets[0], import_history: logs },
  });
});

// ─── DELETE SHEET ───
const deleteSheet = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [existing] = await pool.execute('SELECT id FROM google_sheets WHERE id = ?', [id]);
  if (existing.length === 0) {
    return next(new AppError('Sheet not found', 404));
  }

  await pool.execute('DELETE FROM google_sheets WHERE id = ?', [id]);

  await activityLogger(
    req.user.user_id, 'delete', 'sheets', parseInt(id, 10),
    {}, req.ip, null
  );

  res.json({ success: true, message: 'Sheet deleted successfully' });
});

// ─── LIVE VIEW (fetch live data from Google Sheets without importing) ───
const liveView = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const [sheets] = await pool.execute(
    'SELECT * FROM google_sheets WHERE id = ?',
    [id]
  );
  if (sheets.length === 0) {
    return next(new AppError('Sheet not found', 404));
  }

  const sheet = sheets[0];

  let sheetData;
  try {
    sheetData = await fetchSheetData(sheet.sheet_id, null);
  } catch (err) {
    return next(new AppError(`Failed to fetch live data: ${err.message}`, 502));
  }

  res.json({
    success: true,
    data: {
      sheet_id: sheet.id,
      sheet_name: sheet.sheet_name,
      sheet_tab: sheetData.sheetTitle,
      headers: sheetData.headers,
      rows: sheetData.rows,
      total_rows: sheetData.rows.length,
      fetched_at: new Date().toISOString(),
    },
  });
});

module.exports = {
  addSheet,
  getAllSheets,
  getSheetById,
  deleteSheet,
  liveView,
};
