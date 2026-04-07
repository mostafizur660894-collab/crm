<?php
/**
 * Bimano CRM — Google Sheets API
 * File: /crm/api/sheets.php
 * 
 * GET  /api/sheets.php
 * POST /api/sheets.php
 * DELETE /api/sheets.php?id=123
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
        $sql = "SELECT s.id, s.sheet_name, s.sheet_id, s.sheet_url, s.created_at, u.name as added_by_name
                FROM sheets s
                LEFT JOIN users u ON s.added_by = u.id
                ORDER BY s.created_at DESC";
        
        $result = $conn->query($sql);
        $data = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $sheet_name = trim($input['sheet_name'] ?? '');
        $sheet_url = trim($input['sheet_url'] ?? '');

        if (!$sheet_name || !$sheet_url) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'sheet_name and sheet_url required']);
            exit;
        }

        // Extract sheet ID from Google Sheets URL
        // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/...
        $sheet_id = '';
        if (preg_match('/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/', $sheet_url, $matches)) {
            $sheet_id = $matches[1];
        }

        if (!$sheet_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid Google Sheets URL']);
            exit;
        }

        $user_id = $_SESSION['user_id'];

        $sql = "INSERT INTO sheets (sheet_name, sheet_id, sheet_url, added_by, created_at)
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('sssi', $sheet_name, $sheet_id, $sheet_url, $user_id);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Create failed']);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("SELECT s.id, s.sheet_name, s.sheet_id, s.sheet_url, s.created_at, u.name as added_by_name
                                FROM sheets s
                                LEFT JOIN users u ON s.added_by = u.id
                                WHERE s.id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Sheet linked', 'data' => $created]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM sheets WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Sheet not found']);
            $stmt->close();
            exit;
        }

        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Sheet deleted']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
