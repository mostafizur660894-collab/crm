<?php
/**
 * Bimano CRM — Leaderboard Analytics API
 * File: /crm/api/leaderboard/analytics.php
 * 
 * GET  /api/leaderboard/analytics.php
 */

declare(strict_types=1);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

require_once __DIR__ . '/../../config.php';
$conn = db_connect();

try {
    $total_emp_sql = "SELECT COUNT(*) FROM users WHERE role IN ('employee', 'sub_admin')";
    $total_employees = (int)$conn->query($total_emp_sql)->fetch_row()[0];
    
    $total_points_sql = "SELECT COALESCE(SUM(points), 0) FROM users WHERE role IN ('employee', 'sub_admin')";
    $total_points = (int)$conn->query($total_points_sql)->fetch_row()[0];
    
    $tasks_sql = "SELECT COUNT(*) FROM tasks WHERE status = 'completed'";
    $tasks_completed = (int)$conn->query($tasks_sql)->fetch_row()[0];
    
    echo json_encode([
        'success' => true,
        'data' => [
            'total_employees' => $total_employees,
            'total_points' => $total_points,
            'tasks_completed' => $tasks_completed
        ]
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}
