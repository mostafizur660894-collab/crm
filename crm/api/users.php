<?php
/**
 * Bimano CRM — Users API
 * File: /crm/api/users.php
 * 
 * GET  /api/users.php?page=1&limit=25&search=&branch_id=
 * POST /api/users.php
 * PUT  /api/users.php?id=123
 * DELETE /api/users.php?id=123
 */

declare(strict_types=1);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once __DIR__ . '/../config.php';
$conn = db_connect();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    if ($method === 'GET') {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min((int)($_GET['limit'] ?? 25), 500);
        $offset = ($page - 1) * $limit;
        $search = trim($_GET['search'] ?? '');
        $branch_id = (int)($_GET['branch_id'] ?? 0);

        $where = ['1=1'];
        $params = [];
        $types = '';

        if ($search !== '') {
            $where[] = "(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
            $s = "%{$search}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
            $types .= 'sss';
        }

        if ($branch_id > 0) {
            $where[] = "u.branch_id = ?";
            $params[] = $branch_id;
            $types .= 'i';
        }

        $where_sql = implode(' AND ', $where);

        $count_sql = "SELECT COUNT(*) FROM users u WHERE {$where_sql}";
        $count_stmt = $conn->prepare($count_sql);
        if ($params) $count_stmt->bind_param($types, ...$params);
        $count_stmt->execute();
        $total = (int)$count_stmt->get_result()->fetch_row()[0];
        $count_stmt->close();

        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $sql = "SELECT u.id, u.name, u.email, u.phone, u.role, u.branch_id, u.is_active, b.name as branch_name
                FROM users u 
                LEFT JOIN branches b ON u.branch_id = b.id
                WHERE {$where_sql} 
                ORDER BY u.id DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($sql);
        if ($params) $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode([
            'success' => true,
            'data' => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$name || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, email, and password required']);
            exit;
        }

        // Check if email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            $stmt->close();
            exit;
        }
        $stmt->close();

        $phone = $input['phone'] ?? null;
        $role = $input['role'] ?? 'employee';
        $branch_id = isset($input['branch_id']) ? (int)$input['branch_id'] : null;
        $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;
        
        // Hash password
        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $sql = "INSERT INTO users (name, email, password, phone, role, branch_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('sssssii', $name, $email, $password_hash, $phone, $role, $branch_id, $is_active);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Create failed']);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        // Fetch created user with branch name
        $stmt = $conn->prepare("SELECT u.id, u.name, u.email, u.phone, u.role, u.branch_id, u.is_active, b.name as branch_name
                                FROM users u 
                                LEFT JOIN branches b ON u.branch_id = b.id
                                WHERE u.id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'User created', 'data' => $created]);
        exit;
    }

    if ($method === 'PUT') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = [];
        $types = '';

        // Handle password separately
        if (isset($input['password']) && !empty($input['password'])) {
            $password_hash = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            $updates[] = "password = ?";
            $params[] = $password_hash;
            $types .= 's';
        }

        foreach (['name', 'email', 'phone', 'role'] as $f) {
            if (isset($input[$f])) {
                $updates[] = "{$f} = ?";
                $params[] = $input[$f];
                $types .= 's';
            }
        }

        foreach (['branch_id', 'is_active'] as $f) {
            if (isset($input[$f])) {
                $updates[] = "{$f} = ?";
                $params[] = (int)$input[$f];
                $types .= 'i';
            }
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nothing to update']);
            exit;
        }

        $params[] = $id;
        $types .= 'i';

        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

        // Fetch updated user
        $stmt = $conn->prepare("SELECT u.id, u.name, u.email, u.phone, u.role, u.branch_id, u.is_active, b.name as branch_name
                                FROM users u 
                                LEFT JOIN branches b ON u.branch_id = b.id
                                WHERE u.id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $updated = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode(['success' => true, 'message' => 'User updated', 'data' => $updated]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        // Prevent self-deletion
        if ($id == $_SESSION['user_id']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot delete yourself']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            $stmt->close();
            exit;
        }

        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'User deleted']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
