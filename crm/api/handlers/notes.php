<?php
/**
 * /crm/api/notes
 * GET / POST / PUT / DELETE
 */

$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;
if (!$payload) api_error('Unauthorized.', 401);

$conn   = db_connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$raw    = $method !== 'GET' ? (string) file_get_contents('php://input') : '';
$body   = $raw ? (json_decode($raw, true) ?? []) : [];

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $type = trim($_GET['notable_type'] ?? '');
    $notableId = (int) ($_GET['notable_id'] ?? 0);

    $where  = '1=1'; $params = []; $types = '';
    if ($type !== '') { $where .= ' AND n.`notable_type` = ?'; $params[] = $type; $types .= 's'; }
    if ($notableId)   { $where .= ' AND n.`notable_id` = ?';  $params[] = $notableId; $types .= 'i'; }

    $stmt = $conn->prepare(
        "SELECT n.*, u.`name` as `created_by_name`
         FROM `notes` n
         LEFT JOIN `users` u ON n.`created_by` = u.`id`
         WHERE $where ORDER BY n.`created_at` DESC LIMIT 100"
    );
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'data' => $rows]);
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $content  = trim((string) ($body['content'] ?? ''));
    $type     = trim((string) ($body['notable_type'] ?? ''));
    $notableId = (int) ($body['notable_id'] ?? 0);
    if ($content === '' || $type === '' || !$notableId) {
        $conn->close(); api_error('content, notable_type and notable_id are required.', 400);
    }
    $branchId  = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : 1;
    $createdBy = (int) $payload['user_id'];
    $stmt = $conn->prepare('INSERT INTO `notes` (`content`,`notable_type`,`notable_id`,`branch_id`,`created_by`) VALUES (?,?,?,?,?)');
    $stmt->bind_param('ssiii', $content, $type, $notableId, $branchId, $createdBy);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Note added.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id      = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    $content = trim((string) ($body['content'] ?? ''));
    if (!$id || $content === '') { $conn->close(); api_error('id and content required.', 400); }
    $stmt = $conn->prepare('UPDATE `notes` SET `content` = ? WHERE `id` = ?');
    $stmt->bind_param('si', $content, $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Note updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Note id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `notes` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Note deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
