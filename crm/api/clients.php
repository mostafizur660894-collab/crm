<?php
/**
 * Bimano CRM — Clients API
 * File: /crm/api/clients.php
 * 
 * GET  /api/clients.php?page=1&limit=25
 * POST /api/clients.php
 * PUT  /api/clients.php?id=123
 * DELETE /api/clients.php?id=123
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

        $where = ['1=1'];
        $params = [];
        $types = '';

        if ($search !== '') {
            $where[] = "(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)";
            $s = "%{$search}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
            $types .= 'sss';
        }

        $where_sql = implode(' AND ', $where);

        $count_sql = "SELECT COUNT(*) FROM clients c WHERE {$where_sql}";
        $count_stmt = $conn->prepare($count_sql);
        if ($params) $count_stmt->bind_param($types, ...$params);
        $count_stmt->execute();
        $total = (int)$count_stmt->get_result()->fetch_row()[0];
        $count_stmt->close();

        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $sql = "SELECT c.* FROM clients c WHERE {$where_sql} ORDER BY c.id DESC LIMIT ? OFFSET ?";
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
        $phone = trim($input['phone'] ?? '');

        if (!$name || !$phone) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name and phone required']);
            exit;
        }

        $email = $input['email'] ?? null;
        $company = $input['company'] ?? null;
        $address = $input['address'] ?? null;
        $status = $input['status'] ?? 'active';

        $sql = "INSERT INTO clients (name, email, phone, company, address, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssssss', $name, $email, $phone, $company, $address, $status);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Create failed']);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Client created', 'data' => $created]);
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

        foreach (['name', 'email', 'phone', 'company', 'address', 'status'] as $f) {
            if (isset($input[$f])) {
                $updates[] = "{$f} = ?";
                $params[] = $input[$f];
                $types .= 's';
            }
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nothing to update']);
            exit;
        }

        $params[] = $id;
        $types .= 'i';

        $sql = "UPDATE clients SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $updated = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode(['success' => true, 'message' => 'Client updated', 'data' => $updated]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $sql = "DELETE FROM clients WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Client not found']);
            $stmt->close();
            exit;
        }

        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Client deleted']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
?>
