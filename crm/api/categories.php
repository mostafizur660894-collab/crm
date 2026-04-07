<?php
/**
 * Bimano CRM — Categories API
 * File: /crm/api/categories.php
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

        $total = (int)$conn->query("SELECT COUNT(*) FROM categories")->fetch_row()[0];
        $result = $conn->query("SELECT * FROM categories ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}");
        $data = $result->fetch_all(MYSQLI_ASSOC);

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

        if (!$name) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name required']);
            exit;
        }

        $description = $input['description'] ?? null;

        $sql = "INSERT INTO categories (name, description, created_at) VALUES (?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ss', $name, $description);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Create failed']);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("SELECT * FROM categories WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Category created', 'data' => $created]);
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

        foreach (['name', 'description'] as $f) {
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

        $sql = "UPDATE categories SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT * FROM categories WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $updated = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode(['success' => true, 'message' => 'Category updated', 'data' => $updated]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Category not found']);
            $stmt->close();
            exit;
        }

        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Category deleted']);
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
