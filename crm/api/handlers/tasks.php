<?php
/**
 * /crm/api/tasks
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
    $status = trim($_GET['status'] ?? '');
    $limit  = min((int) ($_GET['limit'] ?? 25), 500);
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;
    $role   = $payload['role'] ?? 'employee';
    $userId = (int) $payload['user_id'];

    $where  = '1=1'; $params = []; $types = '';

    // Employees only see their own tasks
    if ($role === 'employee') {
        $where .= ' AND t.`assigned_to` = ?'; $params[] = $userId; $types .= 'i';
    }
    if ($search !== '') {
        $where .= ' AND t.`title` LIKE ?'; $params[] = "%$search%"; $types .= 's';
    }
    if ($status !== '') {
        $where .= ' AND t.`status` = ?'; $params[] = $status; $types .= 's';
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) FROM `tasks` t WHERE $where");
    if ($params) $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $total = (int) $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    $params[] = $limit; $params[] = $offset; $types .= 'ii';
    $stmt = $conn->prepare(
        "SELECT t.*, u.`name` as `assigned_to_name`, ab.`name` as `assigned_by_name`,
                c.`name` as `category_name`, b.`name` as `branch_name`
         FROM `tasks` t
         LEFT JOIN `users` u ON t.`assigned_to` = u.`id`
         LEFT JOIN `users` ab ON t.`assigned_by` = ab.`id`
         LEFT JOIN `categories` c ON t.`category_id` = c.`id`
         LEFT JOIN `branches` b ON t.`branch_id` = b.`id`
         WHERE $where ORDER BY t.`created_at` DESC LIMIT ? OFFSET ?"
    );
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'data' => $rows, 'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $title = trim((string) ($body['title'] ?? ''));
    $assignedTo = isset($body['assigned_to']) ? (int) $body['assigned_to'] : 0;
    if ($title === '' || !$assignedTo) { $conn->close(); api_error('Title and assigned_to are required.', 400); }

    $desc       = $body['description'] ?? null;
    $assignedBy = (int) $payload['user_id'];
    $categoryId = isset($body['category_id']) && $body['category_id'] ? (int) $body['category_id'] : null;
    $branchId   = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : 1;
    $dueDate    = $body['due_date'] ?? null;
    $reminderAt = $body['reminder_at'] ?? null;
    $points     = (int) ($body['points'] ?? 0);
    $status     = $body['status'] ?? 'pending';
    $priority   = $body['priority'] ?? 'medium';

    $stmt = $conn->prepare(
        'INSERT INTO `tasks` (`title`,`description`,`assigned_to`,`assigned_by`,`category_id`,`branch_id`,`due_date`,`reminder_at`,`points`,`status`,`priority`) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param('ssiiiississ', $title, $desc, $assignedTo, $assignedBy, $categoryId, $branchId, $dueDate, $reminderAt, $points, $status, $priority);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Task created.', 'data' => ['id' => $id]], 201);
}

// ── PUT ───────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Task id required.', 400); }

    $updates = []; $params = []; $types = '';
    foreach (['title' => 's', 'description' => 's', 'due_date' => 's', 'reminder_at' => 's', 'status' => 's', 'priority' => 's'] as $f => $t) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f]; $types .= $t; }
    }
    foreach (['assigned_to', 'category_id', 'branch_id', 'points'] as $f) {
        if (array_key_exists($f, $body)) { $updates[] = "`$f` = ?"; $params[] = $body[$f] !== null ? (int) $body[$f] : null; $types .= 'i'; }
    }
    // Auto-set completed_at
    if (isset($body['status']) && $body['status'] === 'completed') {
        $updates[] = '`completed_at` = NOW()';
    }
    if (empty($updates)) { $conn->close(); api_error('Nothing to update.', 400); }
    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare('UPDATE `tasks` SET ' . implode(', ', $updates) . ' WHERE `id` = ?');
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Task updated.']);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('Task id required.', 400); }
    $stmt = $conn->prepare('DELETE FROM `tasks` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close(); $conn->close();
    api_response(['success' => true, 'message' => 'Task deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
