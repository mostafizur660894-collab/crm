<?php
/**
 * /crm/api/users          GET list / POST create / PUT update / DELETE
 * /crm/api/users/roles    GET roles list
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

// ── GET /users/roles ──────────────────────────────────────────────────────────
global $_api_subpath;
if (isset($_api_subpath) && $_api_subpath === 'users/roles') {
    $roles = [
        ['id' => 1, 'name' => 'admin',     'label' => 'Admin'],
        ['id' => 2, 'name' => 'sub_admin', 'label' => 'Sub-Admin'],
        ['id' => 3, 'name' => 'employee',  'label' => 'Employee'],
        ['id' => 4, 'name' => 'client',    'label' => 'Client'],
    ];
    $conn->close();
    api_response(['success' => true, 'data' => $roles]);
}

// ── GET /users ────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $search = trim((string) ($_GET['search'] ?? ''));
    $limit  = min((int) ($_GET['limit'] ?? 25), 500);
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;
    $role   = trim($_GET['role'] ?? '');

    $where  = '1=1';
    $params = [];
    $types  = '';

    if ($search !== '') {
        $where   .= ' AND (u.`name` LIKE ? OR u.`email` LIKE ?)';
        $s        = "%$search%";
        $params[] = $s;
        $params[] = $s;
        $types   .= 'ss';
    }
    if ($role !== '') {
        $where   .= ' AND u.`role` = ?';
        $params[] = $role;
        $types   .= 's';
    }
    $params[] = $limit;
    $params[] = $offset;
    $types   .= 'ii';

    $sql  = "SELECT u.`id`, u.`name`, u.`email`, u.`role`, u.`phone`,
                    u.`is_active`, u.`branch_id`, u.`created_at`,
                    b.`name` as `branch_name`
             FROM `users` u
             LEFT JOIN `branches` b ON u.`branch_id` = b.`id`
             WHERE $where ORDER BY u.`created_at` DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $countStmt = $conn->prepare("SELECT COUNT(*) FROM `users` u WHERE $where");
    $countParams = array_slice($params, 0, -2);
    $countTypes  = substr($types, 0, -2);
    if ($countParams) $countStmt->bind_param($countTypes, ...$countParams);
    $countStmt->execute();
    $total = (int) $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    $conn->close();
    api_response(['success' => true, 'data' => $rows, 'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
}

// ── POST /users ───────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $name     = trim((string) ($body['name'] ?? ''));
    $email    = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $role     = $body['role'] ?? 'employee';

    if ($name === '' || $email === '' || $password === '') {
        $conn->close(); api_error('name, email and password are required.', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $conn->close(); api_error('Invalid email.', 400);
    }
    $allowedRoles = ['admin', 'sub_admin', 'employee', 'client'];
    if (!in_array($role, $allowedRoles, true)) { $conn->close(); api_error('Invalid role.', 400); }

    $hash     = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $branchId = isset($body['branch_id']) && $body['branch_id'] ? (int) $body['branch_id'] : null;
    $phone    = $body['phone'] ?? null;
    $roleId   = role_to_id($role);

    $stmt = $conn->prepare('INSERT INTO `users` (`name`,`email`,`password`,`role`,`role_id`,`branch_id`,`phone`,`is_active`) VALUES (?,?,?,?,?,?,?,1)');
    $stmt->bind_param('ssssiis', $name, $email, $hash, $role, $roleId, $branchId, $phone);
    if (!$stmt->execute()) {
        $err = $conn->error;
        $stmt->close(); $conn->close();
        api_error(str_contains($err, 'Duplicate') ? 'Email already exists.' : 'Failed to create user.', 400);
    }
    $id = $conn->insert_id;
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'User created.', 'data' => ['id' => $id]], 201);
}

// ── PUT /users/:id ────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('User id required.', 400); }

    $updates = [];
    $params  = [];
    $types   = '';

    foreach (['name', 'email', 'role', 'phone'] as $f) {
        if (isset($body[$f])) {
            $updates[] = "`$f` = ?";
            $params[]  = trim((string) $body[$f]);
            $types    .= 's';
        }
    }
    if (isset($body['branch_id'])) {
        $updates[] = '`branch_id` = ?';
        $params[]  = $body['branch_id'] ? (int) $body['branch_id'] : null;
        $types    .= 'i';
    }
    if (isset($body['is_active'])) {
        $updates[] = '`is_active` = ?';
        $params[]  = (int) $body['is_active'];
        $types    .= 'i';
    }
    if (isset($body['password']) && $body['password'] !== '') {
        $updates[] = '`password` = ?';
        $params[]  = password_hash((string) $body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $types    .= 's';
    }
    if (isset($body['role'])) {
        $updates[] = '`role_id` = ?';
        $params[]  = role_to_id((string) $body['role']);
        $types    .= 'i';
    }

    if (empty($updates)) { $conn->close(); api_error('Nothing to update.', 400); }

    $params[] = $id;
    $types   .= 'i';
    $stmt     = $conn->prepare('UPDATE `users` SET ' . implode(', ', $updates) . ' WHERE `id` = ?');
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'User updated.']);
}

// ── DELETE /users/:id ─────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { $conn->close(); api_error('User id required.', 400); }
    if ((int) ($payload['user_id'] ?? 0) === $id) { $conn->close(); api_error('Cannot delete yourself.', 400); }
    $stmt = $conn->prepare('DELETE FROM `users` WHERE `id` = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    api_response(['success' => true, 'message' => 'User deleted.']);
}

$conn->close();
api_error('Method not allowed.', 405);
