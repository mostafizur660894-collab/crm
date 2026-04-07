<?php
/**
 * Bimano CRM — Leads API
 * File: /crm/api/leads.php
 * 
 * Simple session-based API for CRUD operations
 * Uses PHP $_SESSION for authentication
 * 
 * Endpoints:
 *   GET  /api/leads.php?page=1&limit=25&search=&status=
 *   POST /api/leads.php
 *   PUT  /api/leads.php?id=123
 *   DELETE /api/leads.php?id=123
 */

declare(strict_types=1);

// Start session and check authentication
session_start();

// Set JSON headers
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

// CORS allow credentials
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Authentication Check
// ──────────────────────────────────────────────────────────────────────────────

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized. Please log in.'
    ]);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Database Connection
// ──────────────────────────────────────────────────────────────────────────────

require_once __DIR__ . '/../config.php';

$conn = db_connect();
if (!$conn) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main API Handler
// ──────────────────────────────────────────────────────────────────────────────

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    // ── GET: Fetch all leads ──────────────────────────────────────────────────
    if ($method === 'GET') {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min((int)($_GET['limit'] ?? 25), 500);
        $offset = ($page - 1) * $limit;
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        // Build WHERE clause
        $where = ['1=1'];
        $params = [];
        $types = '';

        if ($search !== '') {
            $where[] = "(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)";
            $s = "%{$search}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
            $types .= 'sss';
        }

        if ($status !== '') {
            $where[] = "l.status = ?";
            $params[] = $status;
            $types .= 's';
        }

        $where_sql = implode(' AND ', $where);

        // Get total count
        $count_sql = "SELECT COUNT(*) FROM leads l WHERE {$where_sql}";
        $count_stmt = $conn->prepare($count_sql);
        if ($params) {
            $count_stmt->bind_param($types, ...$params);
        }
        $count_stmt->execute();
        $total = (int)$count_stmt->get_result()->fetch_row()[0];
        $count_stmt->close();

        // Get paginated data
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $sql = "SELECT l.* 
                FROM leads l 
                WHERE {$where_sql} 
                ORDER BY l.id DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $conn->prepare($sql);
        if ($params) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        exit;
    }

    // ── POST: Create lead ─────────────────────────────────────────────────────
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim($input['name'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$name || !$phone) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Name and phone are required'
            ]);
            exit;
        }

        $email = $input['email'] ?? null;
        $company = $input['company'] ?? null;
        $source = $input['source'] ?? null;
        $status = $input['status'] ?? 'new';
        $notes = $input['notes'] ?? null;
        $category_id = $input['category_id'] ?? null;
        $branch_id = $input['branch_id'] ?? 1;
        $assigned_to = $input['assigned_to'] ?? null;

        $sql = "INSERT INTO leads (name, email, phone, company, source, status, notes, category_id, branch_id, assigned_to, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            'sssssissii',
            $name, $email, $phone, $company, $source, $status, $notes,
            $category_id, $branch_id, $assigned_to
        );

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create lead: ' . $stmt->error
            ]);
            $stmt->close();
            exit;
        }

        $id = $conn->insert_id;
        $stmt->close();

        // Fetch created record
        $stmt = $conn->prepare("SELECT * FROM leads WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $created = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Lead created',
            'data' => $created
        ]);
        exit;
    }

    // ── PUT: Update lead ──────────────────────────────────────────────────────
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

        $fields = ['name', 'email', 'phone', 'company', 'source', 'status', 'notes'];
        foreach ($fields as $f) {
            if (isset($input[$f])) {
                $updates[] = "{$f} = ?";
                $params[] = $input[$f];
                $types .= 's';
            }
        }

        $int_fields = ['category_id', 'branch_id', 'assigned_to'];
        foreach ($int_fields as $f) {
            if (isset($input[$f])) {
                $updates[] = "{$f} = ?";
                $params[] = $input[$f];
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

        $sql = "UPDATE leads SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Update failed: ' . $stmt->error
            ]);
            $stmt->close();
            exit;
        }
        $stmt->close();

        // Fetch updated record
        $stmt = $conn->prepare("SELECT * FROM leads WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $updated = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Lead updated',
            'data' => $updated
        ]);
        exit;
    }

    // ── DELETE: Delete lead ───────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID required']);
            exit;
        }

        $sql = "DELETE FROM leads WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Delete failed: ' . $stmt->error
            ]);
            $stmt->close();
            exit;
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Lead not found']);
            exit;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Lead deleted'
        ]);
        exit;
    }

    // Unsupported method
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
} finally {
    $conn->close();
}
?>
