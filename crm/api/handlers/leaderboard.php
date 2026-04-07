<?php
/**
 * /crm/api/leaderboard          GET
 * /crm/api/leaderboard/analytics GET
 * /crm/api/leaderboard/branches  GET
 */

$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;
if (!$payload) api_error('Unauthorized.', 401);

$conn = db_connect();

global $_api_subpath;
$sub = $_api_subpath ?? 'leaderboard';

// ── /leaderboard/analytics ────────────────────────────────────────────────────
if ($sub === 'leaderboard/analytics') {
    $totalEmployees = (int) ($conn->query("SELECT COUNT(*) FROM `users` WHERE `role` = 'employee' AND `is_active` = 1")->fetch_row()[0] ?? 0);
    $totalPoints    = (int) ($conn->query("SELECT COALESCE(SUM(`points`),0) FROM `points_ledger`")->fetch_row()[0] ?? 0);
    $totalTasks     = (int) ($conn->query("SELECT COUNT(*) FROM `tasks` WHERE `status` = 'completed'")->fetch_row()[0] ?? 0);
    $conn->close();
    api_response([
        'success' => true,
        'data'    => [
            'total_employees' => $totalEmployees,
            'total_points'    => $totalPoints,
            'tasks_completed' => $totalTasks,
        ],
    ]);
}

// ── /leaderboard/branches ─────────────────────────────────────────────────────
if ($sub === 'leaderboard/branches') {
    $res  = $conn->query(
        "SELECT b.`id`, b.`name`,
                COALESCE(SUM(pl.`points`), 0) as `total_points`,
                COUNT(DISTINCT pl.`user_id`) as `active_employees`
         FROM `branches` b
         LEFT JOIN `points_ledger` pl ON pl.`branch_id` = b.`id`
         WHERE b.`is_active` = 1
         GROUP BY b.`id`, b.`name`
         ORDER BY `total_points` DESC"
    );
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $conn->close();
    api_response(['success' => true, 'data' => $rows]);
}

// ── /leaderboard ─────────────────────────────────────────────────────────────
$period   = trim($_GET['period'] ?? 'all');
$branchId = (int) ($_GET['branch_id'] ?? 0);

$where  = "u.`role` = 'employee' AND u.`is_active` = 1";
$params = []; $types = '';

if ($branchId) {
    $where   .= ' AND u.`branch_id` = ?';
    $params[] = $branchId;
    $types   .= 'i';
}

$dateFilter = '';
switch ($period) {
    case 'today':
        $dateFilter = "AND DATE(pl.`created_at`) = CURDATE()"; break;
    case 'week':
        $dateFilter = "AND pl.`created_at` >= DATE_SUB(NOW(), INTERVAL 7 DAY)"; break;
    case 'month':
        $dateFilter = "AND pl.`created_at` >= DATE_SUB(NOW(), INTERVAL 30 DAY)"; break;
}

$stmt = $conn->prepare(
    "SELECT u.`id`, u.`name`, u.`email`, u.`branch_id`, b.`name` as `branch_name`,
            COALESCE(SUM(CASE WHEN 1=1 $dateFilter THEN pl.`points` ELSE 0 END), 0) as `total_points`,
            COUNT(DISTINCT CASE WHEN t.`status` = 'completed' THEN t.`id` END) as `tasks_completed`,
            RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN 1=1 $dateFilter THEN pl.`points` ELSE 0 END), 0) DESC) as `rank`
     FROM `users` u
     LEFT JOIN `branches` b ON u.`branch_id` = b.`id`
     LEFT JOIN `points_ledger` pl ON pl.`user_id` = u.`id`
     LEFT JOIN `tasks` t ON t.`assigned_to` = u.`id`
     WHERE $where
     GROUP BY u.`id`, u.`name`, u.`email`, u.`branch_id`, b.`name`
     ORDER BY `total_points` DESC
     LIMIT 50"
);
if ($params) $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

api_response(['success' => true, 'data' => $rows]);
