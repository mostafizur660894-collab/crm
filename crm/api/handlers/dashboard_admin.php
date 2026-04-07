<?php
/**
 * GET /crm/api/dashboard/admin
 * GET /crm/api/dashboard/sub-admin
 *
 * config.php already included by router.php
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;

if (!$payload || empty($payload['user_id'])) {
    api_error('Unauthorized — please log in.', 401);
}

if (!in_array($payload['role'] ?? '', ['admin', 'sub_admin'], true)) {
    api_error('Forbidden.', 403);
}

$conn = db_connect();

// Helper: run a COUNT query; returns 0 if table doesn't exist
function qcount(mysqli $c, string $sql): int
{
    $r = @$c->query($sql);
    if (!$r) return 0;
    $row = $r->fetch_row();
    return (int) ($row[0] ?? 0);
}

// Helper: run a SELECT query; returns [] if table doesn't exist
function qrows(mysqli $c, string $sql): array
{
    $r = @$c->query($sql);
    if (!$r) return [];
    $rows = [];
    while ($row = $r->fetch_assoc()) {
        $rows[] = $row;
    }
    return $rows;
}

// ── Queries ───────────────────────────────────────────────────────────────────
$totalLeads     = qcount($conn, "SELECT COUNT(*) FROM `leads`");
$totalClients   = qcount($conn, "SELECT COUNT(*) FROM `clients`");
$totalTasks     = qcount($conn, "SELECT COUNT(*) FROM `tasks`");
$completedTasks = qcount($conn, "SELECT COUNT(*) FROM `tasks` WHERE `status` = 'completed'");
$pendingTasks   = qcount($conn, "SELECT COUNT(*) FROM `tasks` WHERE `status` IN ('pending','in_progress')");
$totalPoints    = qcount($conn, "SELECT COALESCE(SUM(`points`), 0) FROM `points_ledger`");
$totalEmployees = qcount($conn, "SELECT COUNT(*) FROM `users` WHERE `role` = 'employee' AND `is_active` = 1");
$totalBranches  = qcount($conn, "SELECT COUNT(*) FROM `branches` WHERE `is_active` = 1");

$completionRate = $totalTasks > 0
    ? (int) round(($completedTasks / $totalTasks) * 100)
    : 0;

$leadsByStatus = qrows($conn, "SELECT `status`, COUNT(*) as `count` FROM `leads` GROUP BY `status`");

$todayLeads     = qcount($conn, "SELECT COUNT(*) FROM `leads` WHERE DATE(`created_at`) = CURDATE()");
$todayCompleted = qcount($conn,
    "SELECT COUNT(*) FROM `tasks` WHERE DATE(`completed_at`) = CURDATE() AND `status` = 'completed'"
);

$recentActivity = qrows($conn,
    "SELECT al.`id`, al.`action`, al.`module`, al.`created_at`, u.`name` as `user_name`
     FROM `activity_logs` al
     LEFT JOIN `users` u ON al.`user_id` = u.`id`
     ORDER BY al.`created_at` DESC
     LIMIT 15"
);

$conn->close();

// ── Response ──────────────────────────────────────────────────────────────────
api_response([
    'success' => true,
    'data'    => [
        'overview' => [
            'total_leads'          => $totalLeads,
            'total_clients'        => $totalClients,
            'total_tasks'          => $totalTasks,
            'completed_tasks'      => $completedTasks,
            'pending_tasks'        => $pendingTasks,
            'task_completion_rate' => $completionRate,
            'total_points'         => $totalPoints,
            'total_employees'      => $totalEmployees,
            'total_branches'       => $totalBranches,
        ],
        'today' => [
            'new_leads'       => $todayLeads,
            'tasks_completed' => $todayCompleted,
        ],
        'leads_by_status' => $leadsByStatus,
        'recent_activity'  => $recentActivity,
    ],
]);
