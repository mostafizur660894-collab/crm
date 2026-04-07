<?php
/**
 * Employee Dashboard
 * Bimano CRM — employee/dashboard.php
 *
 * Only accessible to users with role = 'employee'.
 */

declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

require_role('employee');

$user       = current_user();
$pageTitle  = 'Employee Dashboard';
$activePage = 'dashboard';
$userId     = (int) $user['id'];

// ── Fetch dashboard data ──────────────────────────────────────────────────────
$conn = db_connect();

function emp_count(mysqli $c, string $sql, int $uid): int {
    $stmt = @$c->prepare($sql);
    if (!$stmt) return 0;
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_row();
    $stmt->close();
    return (int) ($row[0] ?? 0);
}

$totalTasks     = emp_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ?", $userId);
$completedTasks = emp_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` = 'completed'", $userId);
$pendingTasks   = emp_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` IN ('pending','in_progress')", $userId);
$overdueTasks   = emp_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `assigned_to` = ? AND `status` != 'completed' AND `due_date` < CURDATE()", $userId);
$myLeads        = emp_count($conn, "SELECT COUNT(*) FROM `leads` WHERE `assigned_to` = ?", $userId);
$myClients      = emp_count($conn, "SELECT COUNT(*) FROM `clients` WHERE `assigned_to` = ?", $userId);
$totalPoints    = emp_count($conn, "SELECT COALESCE(SUM(`points`), 0) FROM `points_ledger` WHERE `user_id` = ?", $userId);

$completionRate = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0;

// Today's follow-ups
$todayFollowups = [];
$stmt = @$conn->prepare(
    "SELECT f.`followup_date`, f.`note`, f.`status`,
            l.`name` as `lead_name`, cl.`name` as `client_name`
     FROM `follow_ups` f
     LEFT JOIN `leads` l ON f.`lead_id` = l.`id`
     LEFT JOIN `clients` cl ON f.`client_id` = cl.`id`
     WHERE f.`assigned_to` = ? AND DATE(f.`followup_date`) = CURDATE() AND f.`status` = 'pending'
     ORDER BY f.`followup_date` ASC"
);
if ($stmt) {
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $todayFollowups[] = $row;
    $stmt->close();
}

// Recent points
$recentPoints = [];
$stmt = @$conn->prepare(
    "SELECT `points`, `reason`, `created_at` FROM `points_ledger` WHERE `user_id` = ? ORDER BY `created_at` DESC LIMIT 8"
);
if ($stmt) {
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $recentPoints[] = $row;
    $stmt->close();
}

$conn->close();

// ── Render ────────────────────────────────────────────────────────────────────
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>

<main class="main-content">
    <div class="page-header">
        <h2>My Dashboard</h2>
        <p>Welcome back, <?= htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') ?>. Here's your performance overview.</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon blue">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $myLeads ?></h3>
                <p>My Leads</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon green">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $myClients ?></h3>
                <p>My Clients</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon orange">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalTasks ?></h3>
                <p>Total Tasks</p>
                <span class="stat-change <?= $completionRate >= 50 ? 'up' : 'down' ?>"><?= $completionRate ?>% done</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon purple">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalPoints ?></h3>
                <p>Total Points</p>
            </div>
        </div>

        <?php if ($overdueTasks > 0): ?>
        <div class="stat-card">
            <div class="stat-icon red">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $overdueTasks ?></h3>
                <p>Overdue Tasks</p>
                <span class="stat-change down">Needs attention</span>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Two-column: Follow-ups + Task Progress -->
    <div class="content-grid">
        <div class="card">
            <div class="card-header">
                <h3>Today's Follow-ups</h3>
                <span class="badge badge-info"><?= count($todayFollowups) ?> pending</span>
            </div>
            <div class="card-body no-pad">
                <?php if (empty($todayFollowups)): ?>
                    <div class="empty-state">
                        <p>No follow-ups scheduled for today</p>
                    </div>
                <?php else: ?>
                    <table class="data-table">
                        <thead><tr><th>Contact</th><th>Time</th><th>Note</th></tr></thead>
                        <tbody>
                        <?php foreach ($todayFollowups as $fu): ?>
                            <tr>
                                <td class="fw-600"><?= htmlspecialchars($fu['lead_name'] ?: $fu['client_name'] ?: '—', ENT_QUOTES, 'UTF-8') ?></td>
                                <td class="text-sm"><?= htmlspecialchars(date('h:i A', strtotime($fu['followup_date'])), ENT_QUOTES, 'UTF-8') ?></td>
                                <td class="text-muted text-sm"><?= htmlspecialchars(mb_strimwidth($fu['note'] ?? '', 0, 50, '…'), ENT_QUOTES, 'UTF-8') ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Task Progress</h3>
            </div>
            <div class="card-body">
                <div style="margin-bottom:1.25rem;">
                    <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:.25rem;">
                        <span>Completion Rate</span>
                        <span class="fw-600"><?= $completionRate ?>%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar green" style="width:<?= $completionRate ?>%"></div>
                    </div>
                </div>
                <ul class="status-list">
                    <li class="status-item">
                        <span><span class="status-dot" style="background:#10b981"></span>Completed</span>
                        <span class="count"><?= $completedTasks ?></span>
                    </li>
                    <li class="status-item">
                        <span><span class="status-dot" style="background:#f59e0b"></span>Pending</span>
                        <span class="count"><?= $pendingTasks ?></span>
                    </li>
                    <?php if ($overdueTasks > 0): ?>
                    <li class="status-item">
                        <span><span class="status-dot" style="background:#ef4444"></span>Overdue</span>
                        <span class="count"><?= $overdueTasks ?></span>
                    </li>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
    </div>

    <!-- Recent Points -->
    <div class="card">
        <div class="card-header">
            <h3>Recent Points Earned</h3>
            <span class="badge badge-purple"><?= $totalPoints ?> total</span>
        </div>
        <div class="card-body no-pad">
            <?php if (empty($recentPoints)): ?>
                <div class="empty-state"><p>No points earned yet</p></div>
            <?php else: ?>
                <table class="data-table">
                    <thead><tr><th>Points</th><th>Reason</th><th>Date</th></tr></thead>
                    <tbody>
                    <?php foreach ($recentPoints as $pt): ?>
                        <tr>
                            <td><span class="badge badge-success">+<?= (int) $pt['points'] ?></span></td>
                            <td><?= htmlspecialchars($pt['reason'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                            <td class="text-muted text-sm" data-time="<?= htmlspecialchars($pt['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($pt['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
