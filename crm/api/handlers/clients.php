<?php
/**
 * /crm/api/clients
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
    $search = trim((string) ($_GET['search'] ?? ''));
    $limit  = min((int) ($_GET['limit'] ?? 25), 500);
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $where  = '1=1'; $params = []; $types = '';
    if ($search !== '') {
        $where .= ' AND (cl.`name` LIKE ? OR cl.`phone` LIKE ? OR cl.`email` LIKE ?)';
        $s = "%$search%";
        $params[] = $s; $params[] = $s; $params[] = $s; $types .= 'sss';
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) FROM `clients` cl WHERE $where");
    if ($params) $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $total = (int) $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    $params[] = $limit; $params[] = $offset; $types .= 'ii';
    $stmt = $conn->prepare(
        "SELECT cl.*, b.`name` as `branch_name`, c.`name` as `category_name`,
                u.`name` as `assigned_to_name`
         FROM `clients` cl
         LEFT JOIN `branches` b ON cl.`branch_id` = b.`id`
         LEFT JOIN `categories` c ON cl.`category_id` = c.`id`
         LEFT JOIN `users` u ON cl.`assigned_to` = u.`id`
         WHERE $where ORDER BY cl.`created_at` DESC LIMIT ? OFFSET ?"
    );
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'data' => $rows, 'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $name  = trim((string) ($body['name'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));
    if ($name === '' || $phone === '') { $conn->close(); api_error('Name and phone are required.', 400); }

    $email      = $body['email'] ?? null;
    $company    = $body['company'] ?? null;
    $address    = $body['address'] ?? null;
    $status     = $body['status'] ?? 'active';
    $categoryId = isset($body['category_id']) && $body['category_id'] ? (int) $body['category_id'] : null;
    $branchId   = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : 1;
    $assignedTo = isset($body['assigned_to']) && $body['assigned_to'] ? (int) $body['assigned_to'] : null;
    $createdBy  = (int) $payload['user_id'];

    $stmt = $conn->prepare('INSERT INTO `clients` (`name`,`email`,`phone`,`company`,`address`,`status`,`category_id`,`branch_id`,`assigned_to`,`created_by`) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('ssssssiiii', $name, $email, $phone, $company, $address, $status, $categoryId, $branchId, $assignedTo, $createdBy);
    if (!$stmt->execute()) {
        $err = $conn->error; $stmt->close(); $conn->close();
        api_error(str_contains($err, 'Duplicate') ? 'Phone already exists in this branch.' : 'Failed to create client.', 400);
    }
    $id = $conn->insert_id;
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Client created.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Client id required.', 400); }

    $updates = []; $params = []; $types = '';
    foreach (['name' => 's', 'email' => 's', 'phone' => 's', 'company' => 's', 'address' => 's', 'status' => 's'] as $f => $t) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f]; $types .= $t; }
    }
    foreach (['category_id', 'branch_id', 'assigned_to'] as $f) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f] ? (int) $body[$f] : null; $types .= 'i'; }
    }
    if (empty($updates)) { $conn->close(); api_error('Nothing to update.', 400); }
    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare('UPDATE `clients` SET ' . implode(', ', $updates) . ' WHERE `id` = ?');
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Client updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Client id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `clients` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Client deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
