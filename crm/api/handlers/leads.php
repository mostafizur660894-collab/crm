<?php
/**
 * /crm/api/leads
 * GET / POST / PUT / DELETE
 * POST /leads/:id/convert  → convert lead to client
 * 
 * Works with both PHP Sessions (admin panel) and JWT tokens (future)
 */

// Support both PHP session auth and JWT tokens
session_start();
$is_authenticated = !empty($_SESSION['user_id']);

// Also check for JWT Bearer token
if (!$is_authenticated) {
    $token = bearer_token();
    $payload = $token ? jwt_decode($token) : null;
    if (!$payload) api_error('Unauthorized.', 401);
} else {
    // Use session user ID as payload
    $payload = ['user_id' => $_SESSION['user_id']];
}

$conn   = db_connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$raw    = $method !== 'GET' ? (string) file_get_contents('php://input') : '';
$body   = $raw ? (json_decode($raw, true) ?? []) : [];

// Check if this is a convert action: POST /leads/<id>/convert
global $_api_subpath;
$isConvert = false;
$convertId = 0;
if ($method === 'POST' && isset($_api_subpath) && preg_match('#^leads/(\d+)/convert$#', $_api_subpath, $m)) {
    $isConvert = true;
    $convertId = (int) $m[1];
}

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $search = trim((string) ($_GET['search'] ?? ''));
    $status = trim($_GET['status'] ?? '');
    $limit  = min((int) ($_GET['limit'] ?? 25), 500);
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $where  = '1=1';
    $params = [];
    $types  = '';

    if ($search !== '') {
        $where   .= ' AND (l.`name` LIKE ? OR l.`phone` LIKE ? OR l.`email` LIKE ?)';
        $s        = "%$search%";
        $params[] = $s; $params[] = $s; $params[] = $s;
        $types   .= 'sss';
    }
    if ($status !== '') {
        $where   .= ' AND l.`status` = ?';
        $params[] = $status;
        $types   .= 's';
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) FROM `leads` l WHERE $where");
    if ($params) $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $total = (int) $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    $params[] = $limit; $params[] = $offset;
    $types   .= 'ii';

    $stmt = $conn->prepare(
        "SELECT l.*, b.`name` as `branch_name`, c.`name` as `category_name`,
                u.`name` as `assigned_to_name`
         FROM `leads` l
         LEFT JOIN `branches` b ON l.`branch_id` = b.`id`
         LEFT JOIN `categories` c ON l.`category_id` = c.`id`
         LEFT JOIN `users` u ON l.`assigned_to` = u.`id`
         WHERE $where ORDER BY l.`created_at` DESC LIMIT ? OFFSET ?"
    );
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'data' => $rows, 'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
}

// ── POST /leads/:id/convert ───────────────────────────────────────────────────
if ($isConvert) {
    $stmt = $conn->prepare('SELECT * FROM `leads` WHERE `id` = ? AND `status` != "converted" LIMIT 1');
    $stmt->bind_param('i', $convertId);
    $stmt->execute();
    $lead = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$lead) { $conn->close(); api_error('Lead not found or already converted.', 404); }

    // Insert into clients
    $branchId = (int) ($lead['branch_id'] ?? 1);
    $stmt2 = $conn->prepare('INSERT INTO `clients` (`name`,`email`,`phone`,`company`,`category_id`,`branch_id`,`assigned_to`,`lead_id`,`created_by`) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt2->bind_param('ssssiiiii',
        $lead['name'], $lead['email'], $lead['phone'], $lead['company'],
        $lead['category_id'], $branchId, $lead['assigned_to'], $convertId,
        $payload['user_id']
    );
    $stmt2->execute();
    $stmt2->close();

    // Update lead status
    $stmt3 = $conn->prepare('UPDATE `leads` SET `status` = "converted" WHERE `id` = ?');
    $stmt3->bind_param('i', $convertId);
    $stmt3->execute();
    $stmt3->close();

    $conn->close();
    api_response(['success' => true, 'message' => 'Lead converted to client.']);
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $name  = trim((string) ($body['name'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));
    if ($name === '' || $phone === '') { $conn->close(); api_error('Name and phone are required.', 400); }

    $email      = $body['email'] ?? null;
    $company    = $body['company'] ?? null;
    $source     = $body['source'] ?? null;
    $status     = $body['status'] ?? 'new';
    $notes      = $body['notes'] ?? null;
    $categoryId = isset($body['category_id']) && $body['category_id'] ? (int) $body['category_id'] : null;
    $branchId   = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : 1;
    $assignedTo = isset($body['assigned_to']) && $body['assigned_to'] ? (int) $body['assigned_to'] : null;
    $createdBy  = (int) $payload['user_id'];

    $stmt = $conn->prepare('INSERT INTO `leads` (`name`,`email`,`phone`,`company`,`source`,`status`,`notes`,`category_id`,`branch_id`,`assigned_to`,`created_by`) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('sssssssiiii', $name, $email, $phone, $company, $source, $status, $notes, $categoryId, $branchId, $assignedTo, $createdBy);
    if (!$stmt->execute()) {
        $err = $conn->error; $stmt->close(); $conn->close();
        api_error(str_contains($err, 'Duplicate') ? 'Phone already exists in this branch.' : 'Failed to create lead.', 400);
    }
    $id = $conn->insert_id;
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'Lead created.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Lead id required.', 400); }

    $updates = []; $params = []; $types = '';
    $fields = ['name' => 's', 'email' => 's', 'phone' => 's', 'company' => 's',
               'source' => 's', 'status' => 's', 'notes' => 's'];
    foreach ($fields as $f => $t) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f]; $types .= $t; }
    }
    foreach (['category_id', 'branch_id', 'assigned_to'] as $f) {
        if (array_key_exists($f, $body)) {
            $updates[] = "`$f` = ?";
            $params[]  = $body[$f] ? (int) $body[$f] : null;
            $types    .= 'i';
        }
    }
    if (empty($updates)) { $conn->close(); api_error('Nothing to update.', 400); }
    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare('UPDATE `leads` SET ' . implode(', ', $updates) . ' WHERE `id` = ?');
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Lead updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Lead id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `leads` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Lead deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
