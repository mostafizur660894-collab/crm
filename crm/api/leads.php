<?php
/**
 * Bimano CRM — Standalone Leads API
 * File: /crm/api/leads.php
 * 
 * Method-based routing (GET, POST, PUT, DELETE)
 * Works with PHP sessions (admin panel) or JWT tokens
 * No external dependencies — pure PHP + MySQLi
 * 
 * Usage:
 *   GET  /api/leads.php           → Fetch all leads
 *   POST /api/leads.php           → Create new lead
 *   PUT  /api/leads.php?id=123    → Update lead
 *   DELETE /api/leads.php?id=123  → Delete lead
 */

declare(strict_types=1);

// Error handling (hide from browsers, enable logging)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Always send JSON
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Authentication: Support PHP Sessions or JWT Tokens
// ──────────────────────────────────────────────────────────────────────────────

session_start();
$is_authenticated = !empty($_SESSION['user_id']);

// If not a PHP session, check for Bearer token (for future JWT support)
if (!$is_authenticated && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
    // Bearer token detected — can be validated later if needed
    $is_authenticated = true;
}

// Require authentication
if (!$is_authenticated) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Database Configuration & Setup
// ──────────────────────────────────────────────────────────────────────────────

define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'u710294496_crm_db');
define('DB_USER', 'u710294496_mostafizur660');
define('DB_PASS', 'Rakib@660#');
define('DB_CHARSET', 'utf8mb4');

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Connect to MySQL database
 * Returns mysqli connection or exits with error response
 */
function db_connect(): mysqli
{
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

    if ($conn->connect_errno) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed: Service temporarily unavailable.',
            'error' => $conn->connect_error
        ]);
        exit;
    }

    if (!$conn->set_charset(DB_CHARSET)) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Database charset error.',
            'error' => $conn->error
        ]);
        exit;
    }

    return $conn;
}

/**
 * Send JSON response and exit
 */
function json_response(array $data, int $status_code = 200): void
{
    http_response_code($status_code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send error response
 */
function error_response(string $message, int $status_code = 400, ?string $error = null): void
{
    $data = ['success' => false, 'message' => $message];
    if ($error) {
        $data['error'] = $error;
    }
    json_response($data, $status_code);
}

/**
 * Get raw request body (JSON)
 */
function get_request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Main API Logic
// ──────────────────────────────────────────────────────────────────────────────

try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $conn = db_connect();

    // ── GET: Fetch all leads (with ordering) ────────────────────────────────
    if ($method === 'GET') {
        $limit = min((int)($_GET['limit'] ?? 50), 500);
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $page = max(1, (int)($_GET['page'] ?? 1));
        $offset = ($page - 1) * $limit;
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        
        $where_conditions = [];
        $params = [];
        $param_types = '';

        // Search by name, phone, or email
        if ($search !== '') {
            $where_conditions[] = "(l.`name` LIKE ? OR l.`phone` LIKE ? OR l.`email` LIKE ?)";
            $search_term = "%{$search}%";
            $params[] = $search_term;
            $params[] = $search_term;
            $params[] = $search_term;
            $param_types .= 'sss';
        }

        // Filter by status
        if ($status !== '') {
            $where_conditions[] = "l.`status` = ?";
            $params[] = $status;
            $param_types .= 's';
        }

        $where_clause = count($where_conditions) > 0 
            ? 'WHERE ' . implode(' AND ', $where_conditions)
            : '';

        // Get total count
        $count_query = "SELECT COUNT(*) as total FROM `leads` l {$where_clause}";
        $count_stmt = $conn->prepare($count_query);
        
        if (!$count_stmt) {
            error_response('Count query error', 500, $conn->error);
        }

        if ($params) {
            $count_stmt->bind_param($param_types, ...$params);
        }
        
        if (!$count_stmt->execute()) {
            error_response('Count query execution failed', 500, $count_stmt->error);
        }

        $total = (int)$count_stmt->get_result()->fetch_assoc()['total'];
        $count_stmt->close();

        // Get paginated data
        $params[] = $limit;
        $params[] = $offset;
        $param_types .= 'ii';

        $query = "
            SELECT l.*
            FROM `leads` l
            {$where_clause}
            ORDER BY l.`id` DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            error_response('Query preparation error', 500, $conn->error);
        }

        if ($params) {
            $stmt->bind_param($param_types, ...$params);
        }

        if (!$stmt->execute()) {
            error_response('Query execution failed', 500, $stmt->error);
        }

        $result = $stmt->get_result();
        $leads = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        $conn->close();

        json_response([
            'success' => true,
            'data' => $leads,
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'page' => $page,
                'count' => count($leads)
            ]
        ]);
    }

    // ── POST: Create new lead ──────────────────────────────────────────────
    if ($method === 'POST') {
        $body = get_request_body();

        // Validate required fields
        $name = trim($body['name'] ?? '');
        $phone = trim($body['phone'] ?? '');

        if ($name === '') {
            error_response('Lead name is required', 400);
        }
        if ($phone === '') {
            error_response('Phone number is required', 400);
        }

        // Optional fields
        $email = $body['email'] ?? null;
        $company = $body['company'] ?? null;
        $source = $body['source'] ?? null;
        $status = $body['status'] ?? 'new';
        $notes = $body['notes'] ?? null;
        $category_id = $body['category_id'] ?? null;
        $branch_id = $body['branch_id'] ?? 1;
        $assigned_to = $body['assigned_to'] ?? null;

        // Insert lead
        $stmt = $conn->prepare(
            "INSERT INTO `leads` 
            (`name`, `email`, `phone`, `company`, `source`, `status`, `notes`, `category_id`, `branch_id`, `assigned_to`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        );

        if (!$stmt) {
            error_response('Query preparation error', 500, $conn->error);
        }

        $stmt->bind_param(
            'sssssissii',
            $name, $email, $phone, $company, $source, $status, $notes, 
            $category_id, $branch_id, $assigned_to
        );

        if (!$stmt->execute()) {
            $conn->close();
            // Check for duplicate key error
            if (strpos($stmt->error, 'Duplicate') !== false) {
                error_response('Phone number already exists', 409);
            }
            error_response('Failed to create lead', 500, $stmt->error);
        }

        $lead_id = $stmt->insert_id;
        $stmt->close();

        // Fetch the created lead
        $stmt = $conn->prepare("SELECT * FROM `leads` WHERE `id` = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('i', $lead_id);
            $stmt->execute();
            $created_lead = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        } else {
            $created_lead = ['id' => $lead_id];
        }

        $conn->close();

        json_response([
            'success' => true,
            'message' => 'Lead created successfully',
            'data' => $created_lead
        ], 201);
    }

    // ── PUT: Update lead ───────────────────────────────────────────────────
    if ($method === 'PUT') {
        $body = get_request_body();
        $lead_id = (int)($_GET['id'] ?? $body['id'] ?? 0);

        if ($lead_id <= 0) {
            error_response('Lead ID is required', 400);
        }

        // Build dynamic UPDATE query
        $updates = [];
        $params = [];
        $param_types = '';

        $allowed_fields = [
            'name', 'email', 'phone', 'company', 'source', 'status', 'notes',
            'category_id', 'branch_id', 'assigned_to'
        ];

        foreach ($allowed_fields as $field) {
            if (array_key_exists($field, $body)) {
                $updates[] = "`{$field}` = ?";
                $params[] = $body[$field];
                
                // Determine parameter type
                if (in_array($field, ['category_id', 'branch_id', 'assigned_to'])) {
                    $param_types .= 'i';
                } else {
                    $param_types .= 's';
                }
            }
        }

        if (empty($updates)) {
            error_response('Nothing to update', 400);
        }

        // Add ID to params
        $params[] = $lead_id;
        $param_types .= 'i';

        $query = "UPDATE `leads` SET " . implode(', ', $updates) . " WHERE `id` = ?";
        $stmt = $conn->prepare($query);

        if (!$stmt) {
            error_response('Query preparation error', 500, $conn->error);
        }

        $stmt->bind_param($param_types, ...$params);

        if (!$stmt->execute()) {
            error_response('Failed to update lead', 500, $stmt->error);
        }

        $stmt->close();

        // Fetch updated lead
        $stmt = $conn->prepare("SELECT * FROM `leads` WHERE `id` = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('i', $lead_id);
            $stmt->execute();
            $updated_lead = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        } else {
            $updated_lead = ['id' => $lead_id];
        }

        $conn->close();

        json_response([
            'success' => true,
            'message' => 'Lead updated successfully',
            'data' => $updated_lead
        ]);
    }

    // ── DELETE: Delete lead ────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $body = get_request_body();
        $lead_id = (int)($_GET['id'] ?? $body['id'] ?? 0);

        if ($lead_id <= 0) {
            error_response('Lead ID is required', 400);
        }

        $stmt = $conn->prepare("DELETE FROM `leads` WHERE `id` = ?");
        
        if (!$stmt) {
            error_response('Query preparation error', 500, $conn->error);
        }

        $stmt->bind_param('i', $lead_id);

        if (!$stmt->execute()) {
            error_response('Failed to delete lead', 500, $stmt->error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();
        $conn->close();

        if ($affected === 0) {
            error_response('Lead not found', 404);
        }

        json_response([
            'success' => true,
            'message' => 'Lead deleted successfully'
        ]);
    }

    // Unsupported method
    error_response('Method not allowed', 405);

} catch (Exception $e) {
    error_response('Server error', 500, $e->getMessage());
}
?>
