<?php
/**
 * GET /crm/api/dashboard/employee
 *
 * config.php already included by router.php
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
$token   = bearer_token();
$payload = $token ? jwt_decode($token) : null;

if (!$payload || empty($payload['user_id'])) {
    api_error('Unauthorized — please log in.', 401);
}

$userId = (int) $payload['user_id'];
$conn   = db_connect();

// ── Helpers ───────────────────────────────────────────────────────────────────
function eq_count(mysqli $c, string $sql, string $types, ...$params): int
{
    $stmt = @$c->prepare($sql);
    if (!$stmt) return 0;
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_row() : null;
    $stmt->close();
    return (int) ($row[0] ?? 0);
}

function eq_rows(mysqli $c, string $sql, string $types, ...$params): array
{
    $stmt = @$c->prepare($sql);
    if (!$stmt) return [];
    if ($params) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    if (!$result) { $stmt->close(); return []; }
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $stmt->close();
    return $rows;
}

// ── Task counts ───────────────────────────────────────────────────────────────
$totalTasks     = eq_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ?", 'i', $userId);
$completedTasks = eq_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` = 'completed'", 'i', $userId);
$pendingTasks   = eq_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` IN ('pending','in_progress')", 'i', $userId);
$overdueTasks   = eq_count($conn,
    "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` != 'completed' AND `due_date` < CURDATE()",
    'i', $userId
);

$completionRate = $totalTasks > 0
    ? (int) round(($completedTasks / $totalTasks) * 100)
    : 0;

// ── Points ────────────────────────────────────────────────────────────────────
$totalPoints  = eq_count($conn, "SELECT COALESCE(SUM(`points`), 0) FROM `points_ledger` WHERE `user_id` = ?", 'i', $userId);
$recentPoints = eq_rows($conn,
    "SELECT `points`, `reason`, `created_at` FROM `points_ledger` WHERE `user_id` = ? ORDER BY `created_at` DESC LIMIT 10",
    'i', $userId
);

// ── Lead / client counts ──────────────────────────────────────────────────────
$myLeads   = eq_count($conn, "SELECT COUNT(*) FROM `leads` WHERE `assigned_to` = ?", 'i', $userId);
$myClients = eq_count($conn, "SELECT COUNT(*) FROM `clients` WHERE `assigned_to` = ?", 'i', $userId);

// ── Today's follow-ups ────────────────────────────────────────────────────────
$todayFollowups = eq_rows($conn,
    "SELECT f.`id`, f.`followup_date`, f.`note`, f.`status`,
            l.`name` as `lead_name`, l.`phone` as `lead_phone`,
            cl.`name` as `client_name`, cl.`phone` as `client_phone`
     FROM `follow_ups` f
     LEFT JOIN `leads`   l  ON f.`lead_id`   = l.`id`
     LEFT JOIN `clients` cl ON f.`client_id` = cl.`id`
     WHERE f.`assigned_to` = ? AND DATE(f.`followup_date`) = CURDATE() AND f.`status` = 'pending'
     ORDER BY f.`followup_date` ASC",
    'i', $userId
);

// ── Today's task reminders ────────────────────────────────────────────────────
$todayReminders = eq_rows($conn,
    "SELECT `id`, `title`, `due_date`, `reminder_at`, `priority`, `status`
     FROM `tasks`
     WHERE `assigned_to` = ? AND DATE(`reminder_at`) = CURDATE() AND `status` != 'completed'
     ORDER BY `reminder_at` ASC",
    'i', $userId
);

// ── Activity summary ──────────────────────────────────────────────────────────
$activities = eq_rows($conn,
    "SELECT `type`, COUNT(*) as `count`, SUM(`points`) as `total_points`
     FROM `employee_activities`
     WHERE `employee_id` = ?
     GROUP BY `type`",
    'i', $userId
);

$conn->close();

// ── Response ──────────────────────────────────────────────────────────────────
api_response([
    'success' => true,
    'data'    => [
        'tasks' => [
            'total'           => $totalTasks,
            'completed'       => $completedTasks,
            'pending'         => $pendingTasks,
            'overdue'         => $overdueTasks,
            'completion_rate' => $completionRate,
        ],
        'points'          => [
            'total'  => $totalPoints,
            'recent' => $recentPoints,
        ],
        'leads'           => $myLeads,
        'clients'         => $myClients,
        'today_followups' => $todayFollowups,
        'today_reminders' => $todayReminders,
        'activities'      => $activities,
    ],
]);
