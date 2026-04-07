<?php
/**
 * Bimano CRM — Leaderboard API
 * File: /crm/api/leaderboard.php
 * 
 * GET  /api/leaderboard.php?period=all|month|week|today
 * GET  /api/leaderboard/analytics
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

require_once __DIR__ . '/../config.php';
$conn = db_connect();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    if ($method === 'GET') {
        $period = trim($_GET['period'] ?? 'all');
        
        // Build SQL for rankings
        $sql = "SELECT 
                    @rank:=@rank+1 as rank,
                    u.id,
                    u.name,
                    b.name as branch_name,
                    COALESCE(u.points, 0) as total_points
                FROM users u
                LEFT JOIN branches b ON u.branch_id = b.id,
                (SELECT @rank:=0) AS init
                WHERE u.role IN ('employee', 'sub_admin')
                ORDER BY u.points DESC LIMIT 1000";
        
        $result = $conn->query($sql);
        $data = $result->fetch_all(MYSQLI_ASSOC);
        
        // Fetch completed tasks count for each user
        foreach ($data as &$row) {
            $task_sql = "SELECT COUNT(*) FROM tasks WHERE assigned_to = {$row['id']} AND status = 'completed'";
            $row['tasks_completed'] = (int)$conn->query($task_sql)->fetch_row()[0];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
