<?php
/**
 * /crm/api/followups
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
    $date   = trim($_GET['date'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $limit  = min((int) ($_GET['limit'] ?? 50), 500);
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;
    $role   = $payload['role'] ?? 'employee';
    $userId = (int) $payload['user_id'];

    $where  = '1=1'; $params = []; $types = '';
    if ($role === 'employee') {
        $where .= ' AND f.`assigned_to` = ?'; $params[] = $userId; $types .= 'i';
    }
    if ($date !== '') {
        $where .= ' AND DATE(f.`followup_date`) = ?'; $params[] = $date; $types .= 's';
    }
    if ($status !== '') {
        $where .= ' AND f.`status` = ?'; $params[] = $status; $types .= 's';
    }

    $countParams = $params;
    $countTypes  = $types;
    $countStmt   = $conn->prepare("SELECT COUNT(*) FROM `follow_ups` f WHERE $where");
    if ($countParams) $countStmt->bind_param($countTypes, ...$countParams);
    $countStmt->execute();
    $total = (int) $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    $params[] = $limit; $params[] = $offset; $types .= 'ii';
    $stmt = $conn->prepare(
        "SELECT f.*, l.`name` as `lead_name`, l.`phone` as `lead_phone`,
                cl.`name` as `client_name`, cl.`phone` as `client_phone`,
                u.`name` as `assigned_to_name`, b.`name` as `branch_name`
         FROM `follow_ups` f
         LEFT JOIN `leads` l ON f.`lead_id` = l.`id`
         LEFT JOIN `clients` cl ON f.`client_id` = cl.`id`
         LEFT JOIN `users` u ON f.`assigned_to` = u.`id`
         LEFT JOIN `branches` b ON f.`branch_id` = b.`id`
         WHERE $where ORDER BY f.`followup_date` DESC LIMIT ? OFFSET ?"
    );
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'data' => $rows, 'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $followupDate = trim((string) ($body['followup_date'] ?? ''));
    $assignedTo   = isset($body['assigned_to']) ? (int) $body['assigned_to'] : (int) $payload['user_id'];
    if ($followupDate === '') { $conn->close(); api_error('followup_date is required.', 400); }

    $leadId   = isset($body['lead_id']) && $body['lead_id'] ? (int) $body['lead_id'] : null;
    $clientId = isset($body['client_id']) && $body['client_id'] ? (int) $body['client_id'] : null;
    $note     = $body['note'] ?? null;
    $status   = $body['status'] ?? 'pending';
    $branchId = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : 1;
    $createdBy = (int) $payload['user_id'];

    $stmt = $conn->prepare('INSERT INTO `follow_ups` (`lead_id`,`client_id`,`assigned_to`,`created_by`,`followup_date`,`note`,`status`,`branch_id`) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->bind_param('iiissssi', $leadId, $clientId, $assignedTo, $createdBy, $followupDate, $note, $status, $branchId);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Follow-up created.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Follow-up id required.', 400); }

    $updates = []; $params = []; $types = '';
    foreach (['followup_date' => 's', 'note' => 's', 'status' => 's'] as $f => $t) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f]; $types .= $t; }
    }
    foreach (['lead_id', 'client_id', 'assigned_to', 'branch_id'] as $f) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f] ? (int) $body[$f] : null; $types .= 'i'; }
    }
    if (empty($updates)) { $conn->close(); api_error('Nothing to update.', 400); }
    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare('UPDATE `follow_ups` SET ' . implode(', ', $updates) . ' WHERE `id` = ?');
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Follow-up updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Follow-up id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `follow_ups` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Follow-up deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
