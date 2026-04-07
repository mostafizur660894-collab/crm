<?php
/**
 * /crm/api/sheets          GET list / POST add
 * /crm/api/sheets/:id      DELETE
 * /crm/api/sheets/:id/live GET live data (returns empty — no Google Sheets integration)
 */

$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;
if (!$payload) api_error('Unauthorized.', 401);

if (!in_array($payload['role'] ?? '', ['admin', 'sub_admin'], true)) {
    api_error('Forbidden.', 403);
}

$conn   = db_connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$raw    = $method !== 'GET' ? (string) file_get_contents('php://input') : '';
$body   = $raw ? (json_decode($raw, true) ?? []) : [];

global $_api_subpath;
$sub = $_api_subpath ?? '';

// ── /sheets/:id/live ─────────────────────────────────────────────────────────
if ($method === 'GET' && preg_match('#^sheets/(\d+)/live$#', $sub)) {
    $conn->close();
    api_response(['success' => true, 'data' => ['rows' => [], 'headers' => [], 'note' => 'Live Google Sheets sync requires server-side configuration.']]);
}

// ── GET /sheets ───────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $res  = $conn->query(
        "SELECT gs.*, u.`name` as `added_by_name`
         FROM `google_sheets` gs
         LEFT JOIN `users` u ON gs.`added_by` = u.`id`
         ORDER BY gs.`created_at` DESC"
    );
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $conn->close();
    api_response(['success' => true, 'data' => $rows]);
}

// ── POST /sheets ──────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $url  = trim((string) ($body['sheet_url'] ?? ''));
    $name = trim((string) ($body['sheet_name'] ?? ''));
    if ($url === '') { $conn->close(); api_error('sheet_url is required.', 400); }

    // Extract sheet ID from URL
    preg_match('#/d/([a-zA-Z0-9_-]+)#', $url, $m);
    $sheetId  = $m[1] ?? md5($url);
    $addedBy  = (int) $payload['user_id'];

    $stmt = $conn->prepare('INSERT INTO `google_sheets` (`sheet_url`,`sheet_id`,`sheet_name`,`added_by`) VALUES (?,?,?,?)');
    $stmt->bind_param('sssi', $url, $sheetId, $name, $addedBy);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Sheet added.', 'data' => ['id' => $id]], 201);
}

// ── DELETE /sheets/:id ────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    // Also try extracting from URL path
    if (!$id && preg_match('#sheets/(\d+)$#', $sub, $m2)) $id = (int) $m2[1];
    if (!$id) { $conn->close(); api_error('Sheet id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `google_sheets` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Sheet deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
