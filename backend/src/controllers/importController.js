const { pool } = require('../database/connection');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const activityLogger = require('../utils/activityLogger');
const { fetchSheetData } = require('../utils/googleSheetsService');

// Point rules
const POINTS = {
  call: 5,
  visit: 10,
};

// ─── IMPORT LEADS FROM SHEET ───
const importFromSheet = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // google_sheets.id
  const { mode = 'skip' } = req.body; // 'skip' or 'update'

  if (!['skip', 'update'].includes(mode)) {
    return next(new AppError("mode must be 'skip' or 'update'", 400));
  }

  // 1. Fetch sheet record
  const [sheets] = await pool.execute(
    'SELECT * FROM google_sheets WHERE id = ?',
    [id]
  );
  if (sheets.length === 0) {
    return next(new AppError('Sheet not found', 404));
  }
  const sheet = sheets[0];

  // 2. Fetch data from Google Sheets
  let sheetData;
  try {
    sheetData = await fetchSheetData(sheet.sheet_id, null);
  } catch (err) {
    return next(new AppError(`Failed to fetch sheet data: ${err.message}`, 502));
  }

  const { headers, rows } = sheetData;
  if (rows.length === 0) {
    return next(new AppError('Sheet has no data rows', 400));
  }

  // 3. Map header columns (case-insensitive, flexible naming)
  const colMap = {};
  const headerAliases = {
    name: ['name', 'lead name', 'full name', 'contact name'],
    phone: ['phone', 'phone number', 'mobile', 'contact'],
    category: ['category', 'type', 'lead category'],
    assigned_to: ['assigned to', 'assigned', 'employee', 'agent'],
    branch: ['branch', 'branch name', 'office'],
    status: ['status', 'lead status'],
    email: ['email', 'email address', 'e-mail'],
    company: ['company', 'company name', 'business'],
    source: ['source', 'lead source', 'origin'],
    notes: ['notes', 'note', 'remarks', 'comment'],
    call: ['call', 'called', 'call done', 'phone call'],
    visit: ['visit', 'visited', 'visit done', 'site visit'],
  };

  for (const [field, aliases] of Object.entries(headerAliases)) {
    const idx = headers.findIndex((h) => aliases.includes(h.toLowerCase().trim()));
    if (idx !== -1) colMap[field] = idx;
  }

  // Validate required columns
  if (colMap.name === undefined) {
    return next(new AppError('Sheet must have a "Name" column', 400));
  }
  if (colMap.phone === undefined) {
    return next(new AppError('Sheet must have a "Phone" column', 400));
  }
  if (colMap.branch === undefined) {
    return next(new AppError('Sheet must have a "Branch" column', 400));
  }

  // 4. Pre-load lookup maps (categories, users, branches)
  const [categories] = await pool.execute(
    'SELECT id, LOWER(name) as name FROM categories WHERE is_active = 1'
  );
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  const [users] = await pool.execute(
    'SELECT id, LOWER(name) as name, branch_id FROM users WHERE is_active = 1'
  );
  // Group users by branch to handle same-name employees in different branches
  const usersByBranch = new Map();
  for (const u of users) {
    if (!usersByBranch.has(u.branch_id)) usersByBranch.set(u.branch_id, new Map());
    usersByBranch.get(u.branch_id).set(u.name, u.id);
  }

  const [branches] = await pool.execute(
    'SELECT id, LOWER(name) as name FROM branches WHERE is_active = 1'
  );
  const branchMap = new Map(branches.map((b) => [b.name, b.id]));

  // 5. Process rows
  const results = {
    imported: 0,
    updated: 0,
    skipped: 0,
    activities_created: 0,
    points_awarded: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row + 0-index

    try {
      // Extract and sanitize values
      const getValue = (field) => {
        const idx = colMap[field];
        if (idx === undefined || idx >= row.length) return null;
        const val = row[idx];
        return val ? val.toString().trim() : null;
      };

      const name = getValue('name');
      const phone = getValue('phone');
      const branchName = getValue('branch');

      // Skip empty rows
      if (!name && !phone) continue;

      // Validate required fields
      if (!name) {
        results.errors.push(`Row ${rowNum}: Missing name`);
        results.skipped++;
        continue;
      }
      if (!phone) {
        results.errors.push(`Row ${rowNum}: Missing phone`);
        results.skipped++;
        continue;
      }
      if (!branchName) {
        results.errors.push(`Row ${rowNum}: Missing branch`);
        results.skipped++;
        continue;
      }

      // Sanitize phone — strip non-numeric except leading +
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      if (cleanPhone.length < 7) {
        results.errors.push(`Row ${rowNum}: Invalid phone number "${phone}"`);
        results.skipped++;
        continue;
      }

      // Resolve branch
      const branchId = branchMap.get(branchName.toLowerCase());
      if (!branchId) {
        results.errors.push(`Row ${rowNum}: Branch "${branchName}" not found`);
        results.skipped++;
        continue;
      }

      // Resolve category (optional)
      const categoryName = getValue('category');
      let categoryId = null;
      if (categoryName) {
        categoryId = categoryMap.get(categoryName.toLowerCase()) || null;
        if (!categoryId) {
          results.errors.push(`Row ${rowNum}: Category "${categoryName}" not found (lead will be imported without category)`);
        }
      }

      // Resolve assigned employee (optional)
      const assignedName = getValue('assigned_to');
      let assignedTo = null;
      if (assignedName) {
        const branchUsers = usersByBranch.get(branchId);
        if (branchUsers) {
          assignedTo = branchUsers.get(assignedName.toLowerCase()) || null;
        }
        if (!assignedTo) {
          results.errors.push(`Row ${rowNum}: Employee "${assignedName}" not found in branch (lead will be imported unassigned)`);
        }
      }

      // Resolve other optional fields
      const email = getValue('email');
      const company = getValue('company');
      const source = getValue('source') || 'google_sheet';
      const notes = getValue('notes');
      const statusRaw = getValue('status');
      const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
      const status = statusRaw && validStatuses.includes(statusRaw.toLowerCase())
        ? statusRaw.toLowerCase()
        : 'new';

      // 6. DUPLICATE CHECK (phone + branch is unique per schema)
      const [existingLead] = await pool.execute(
        'SELECT id, assigned_to FROM leads WHERE phone = ? AND branch_id = ?',
        [cleanPhone, branchId]
      );

      let leadId;

      if (existingLead.length > 0) {
        if (mode === 'skip') {
          results.skipped++;
          // Still process activities for existing leads
          leadId = existingLead[0].id;
          assignedTo = assignedTo || existingLead[0].assigned_to;
        } else {
          // mode === 'update'
          await pool.execute(
            `UPDATE leads SET
              name = ?, email = COALESCE(?, email), company = COALESCE(?, company),
              source = COALESCE(?, source), status = ?, category_id = COALESCE(?, category_id),
              assigned_to = COALESCE(?, assigned_to), notes = COALESCE(?, notes),
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, email, company, source, status, categoryId, assignedTo, notes, existingLead[0].id]
          );
          leadId = existingLead[0].id;
          assignedTo = assignedTo || existingLead[0].assigned_to;
          results.updated++;
        }
      } else {
        // Insert new lead
        const [insertResult] = await pool.execute(
          `INSERT INTO leads (name, email, phone, company, source, status, category_id, branch_id, assigned_to, notes, imported_from, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, email, cleanPhone, company, source, status, categoryId, branchId, assignedTo, notes, `sheet:${sheet.id}`, req.user.user_id]
        );
        leadId = insertResult.insertId;
        results.imported++;
      }

      // 7. AUTO ACTIVITY DETECTION (Call/Visit columns)
      const callVal = getValue('call');
      const visitVal = getValue('visit');
      const isTruthy = (v) => v && ['yes', 'y', '1', 'true', 'done', 'completed'].includes(v.toLowerCase());

      if (isTruthy(callVal) && assignedTo) {
        await pool.execute(
          `INSERT INTO employee_activities (employee_id, lead_id, type, points, branch_id, import_log_id)
           VALUES (?, ?, 'call', ?, ?, NULL)`,
          [assignedTo, leadId, POINTS.call, branchId]
        );

        // Auto points to points_ledger
        await pool.execute(
          `INSERT INTO points_ledger (user_id, points, reason, branch_id)
           VALUES (?, ?, ?, ?)`,
          [assignedTo, POINTS.call, `Call activity - Lead: ${name}`, branchId]
        );

        results.activities_created++;
        results.points_awarded += POINTS.call;
      }

      if (isTruthy(visitVal) && assignedTo) {
        await pool.execute(
          `INSERT INTO employee_activities (employee_id, lead_id, type, points, branch_id, import_log_id)
           VALUES (?, ?, 'visit', ?, ?, NULL)`,
          [assignedTo, leadId, POINTS.visit, branchId]
        );

        await pool.execute(
          `INSERT INTO points_ledger (user_id, points, reason, branch_id)
           VALUES (?, ?, ?, ?)`,
          [assignedTo, POINTS.visit, `Visit activity - Lead: ${name}`, branchId]
        );

        results.activities_created++;
        results.points_awarded += POINTS.visit;
      }
    } catch (rowErr) {
      results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
      results.skipped++;
    }
  }

  // 8. Create import log
  const [logResult] = await pool.execute(
    `INSERT INTO sheet_import_logs (sheet_id, imported_by, rows_imported, rows_skipped, errors)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sheet.id,
      req.user.user_id,
      results.imported + results.updated,
      results.skipped,
      results.errors.length > 0 ? JSON.stringify(results.errors.slice(0, 100)) : null, // Cap stored errors
    ]
  );

  // Update activities with import_log_id (backfill the ones just inserted without it)
  // We skip this for simplicity — the import_log_id on activities is optional

  // 9. Update sheet last_imported_at
  await pool.execute(
    'UPDATE google_sheets SET last_imported_at = CURRENT_TIMESTAMP WHERE id = ?',
    [sheet.id]
  );

  await activityLogger(
    req.user.user_id, 'import', 'sheets', sheet.id,
    { imported: results.imported, updated: results.updated, skipped: results.skipped },
    req.ip, null
  );

  res.json({
    success: true,
    message: 'Import completed',
    data: {
      sheet_id: sheet.id,
      import_log_id: logResult.insertId,
      total_rows: rows.length,
      imported: results.imported,
      updated: results.updated,
      skipped: results.skipped,
      activities_created: results.activities_created,
      points_awarded: results.points_awarded,
      errors: results.errors.slice(0, 50), // Return first 50 errors
    },
  });
});

// ─── GET IMPORT LOGS ───
const getImportLogs = asyncHandler(async (req, res) => {
  const { sheet_id, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT sil.*, gs.sheet_name, gs.sheet_url, u.name as imported_by_name
    FROM sheet_import_logs sil
    LEFT JOIN google_sheets gs ON sil.sheet_id = gs.id
    LEFT JOIN users u ON sil.imported_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (sheet_id) {
    query += ' AND sil.sheet_id = ?';
    params.push(parseInt(sheet_id, 10));
  }

  query += ' ORDER BY sil.created_at DESC';

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, (pageNum - 1) * limitNum);

  const [logs] = await pool.execute(query, params);

  res.json({ success: true, data: logs });
});

module.exports = {
  importFromSheet,
  getImportLogs,
};
