const { google } = require('googleapis');
const config = require('../config');
const logger = require('./logger');

/**
 * Extract spreadsheet ID from a Google Sheets URL.
 * Supports formats:
 *   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
 *   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
 *   Just the raw ID string
 */
function extractSpreadsheetId(url) {
  if (!url) return null;

  // Direct ID (no slashes)
  if (!url.includes('/')) return url;

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Get authenticated Google Sheets API client.
 */
function getSheetsClient() {
  const { serviceAccountEmail, privateKey } = config.google;

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google Sheets API credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env');
  }

  const auth = new google.auth.JWT(
    serviceAccountEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch all rows from the first sheet (or a named sheet) of a spreadsheet.
 * Returns { headers: string[], rows: string[][] }
 */
async function fetchSheetData(spreadsheetId, sheetName) {
  const sheets = getSheetsClient();

  // Get spreadsheet metadata if no sheet name provided
  if (!sheetName) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    sheetName = meta.data.sheets[0].properties.title;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const allRows = response.data.values;
  if (!allRows || allRows.length < 2) {
    return { headers: allRows ? allRows[0] : [], rows: [], sheetTitle: sheetName };
  }

  const headers = allRows[0].map((h) => h.toString().trim().toLowerCase());
  const rows = allRows.slice(1);

  return { headers, rows, sheetTitle: sheetName };
}

/**
 * Get spreadsheet title.
 */
async function getSpreadsheetTitle(spreadsheetId) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  return meta.data.properties.title;
}

module.exports = {
  extractSpreadsheetId,
  getSheetsClient,
  fetchSheetData,
  getSpreadsheetTitle,
};
