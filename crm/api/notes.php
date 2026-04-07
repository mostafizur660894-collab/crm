<?php
/**
 * Bimano CRM — Notes API
 * File: /crm/api/notes.php
 * 
 * GET  /api/notes.php?client_id=123
 * POST /api/notes.php
 * PUT  /api/notes.php?id=123
 * DELETE /api/notes.php?id=123
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
        $client_id = (int)($_GET['client_id'] ?? 0);
        
        if ($client_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'client_id required']);
            exit;
        }

        $sql = "SELECT n.id, n.client_id, n.content, n.created_at, u.name as created_by
                FROM notes n
                LEFT JOIN users u ON n.created_by = u.id
                WHERE n.client_id = ?
                ORDER BY n.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $client_id);
        $stmt->execute();
        $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $client_id = (int)($input['client_id'] ?? 0);
        $content = trim($input['content'] ?? '');

        if ($client_id <= 0 || !$content) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'client_id and content required']);
            exit;
        }

        $user_id = $_SESSION['user_id'];

        $sql = "INSERT INTO notes (client_id, created_by, content, created_at)
                VALUES (?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('iis', $client_id, $user_id, $content);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Create failed']);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("SELECT n.id, n.client_id, n.content, n.created_at, u.name as created_by
                                FROM notes n
                                LEFT JOIN users u ON n.created_by = u.id
                                WHERE n.id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Note created', 'data' => $created]);
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
        $content = trim($input['content'] ?? '');

        if (!$content) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Content required']);
            exit;
        }

        $sql = "UPDATE notes SET content = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('si', $content, $id);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT n.id, n.client_id, n.content, n.created_at, u.name as created_by
                                FROM notes n
                                LEFT JOIN users u ON n.created_by = u.id
                                WHERE n.id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $updated = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode(['success' => true, 'message' => 'Note updated', 'data' => $updated]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM notes WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Note not found']);
            $stmt->close();
            exit;
        }

        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Note deleted']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
