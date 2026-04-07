<?php
/**
 * Admin Dashboard
 * Bimano CRM — admin/dashboard.php
 *
 * Only accessible to users with role = 'admin'.
 */

declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

require_role('admin');

$user      = current_user();
$pageTitle = 'Admin Dashboard';
$activePage = 'dashboard';

// ── Fetch dashboard data ──────────────────────────────────────────────────────
$conn = db_connect();

// Safe count helper
function dash_count(mysqli $c, string $sql): int {
    $r = @$c->query($sql);
    if (!$r) return 0;
    return (int) ($r->fetch_row()[0] ?? 0);
}

$totalLeads     = dash_count($conn, "SELECT COUNT(*) FROM `leads`");
$totalClients   = dash_count($conn, "SELECT COUNT(*) FROM `clients`");
$totalTasks     = dash_count($conn, "SELECT COUNT(*) FROM `tasks`");
$completedTasks = dash_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `status` = 'completed'");
$pendingTasks   = dash_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE `status` IN ('pending','in_progress')");
$totalEmployees = dash_count($conn, "SELECT COUNT(*) FROM `users` WHERE `role` = 'employee' AND `is_active` = 1");
$totalBranches  = dash_count($conn, "SELECT COUNT(*) FROM `branches` WHERE `is_active` = 1");
$todayLeads     = dash_count($conn, "SELECT COUNT(*) FROM `leads` WHERE DATE(`created_at`) = CURDATE()");
$todayCompleted = dash_count($conn, "SELECT COUNT(*) FROM `tasks` WHERE DATE(`completed_at`) = CURDATE() AND `status` = 'completed'");

$completionRate = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0;

// Leads by status
$leadsByStatus = [];
$r = @$conn->query("SELECT `status`, COUNT(*) as `count` FROM `leads` GROUP BY `status`");
if ($r) { while ($row = $r->fetch_assoc()) $leadsByStatus[] = $row; }

// Recent activity
$recentActivity = [];
$r = @$conn->query(
    "SELECT al.`action`, al.`module`, al.`created_at`, u.`name` as `user_name`
     FROM `activity_logs` al
     LEFT JOIN `users` u ON al.`user_id` = u.`id`
     ORDER BY al.`created_at` DESC
     LIMIT 10"
);
if ($r) { while ($row = $r->fetch_assoc()) $recentActivity[] = $row; }

$conn->close();

// ── Render ────────────────────────────────────────────────────────────────────
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>

<main class="main-content">
    <div class="page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back, <?= htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') ?>. Here's what's happening today.</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon blue">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalLeads ?></h3>
                <p>Total Leads</p>
                <?php if ($todayLeads > 0): ?>
                    <span class="stat-change up">+<?= $todayLeads ?> today</span>
                <?php endif; ?>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon green">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalClients ?></h3>
                <p>Total Clients</p>
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
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v-1"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalEmployees ?></h3>
                <p>Active Employees</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon red">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m0 0h14M5 21H3m16 0h2M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"/></svg>
            </div>
            <div class="stat-details">
                <h3><?= $totalBranches ?></h3>
                <p>Active Branches</p>
            </div>
        </div>
    </div>

    <!-- Two-column layout: Leads by Status + Task Progress -->
    <div class="content-grid">
        <div class="card">
            <div class="card-header">
                <h3>Leads by Status</h3>
                <span class="badge badge-primary"><?= $totalLeads ?> total</span>
            </div>
            <div class="card-body">
                <?php if (empty($leadsByStatus)): ?>
                    <div class="empty-state">
                        <p>No lead data yet</p>
                    </div>
                <?php else: ?>
                    <ul class="status-list">
                        <?php
                        $statusColors = [
                            'new'        => '#3b82f6',
                            'contacted'  => '#f59e0b',
                            'qualified'  => '#8b5cf6',
                            'proposal'   => '#06b6d4',
                            'negotiation'=> '#ec4899',
                            'converted'  => '#10b981',
                            'lost'       => '#ef4444',
                        ];
                        foreach ($leadsByStatus as $ls):
                            $st  = $ls['status'] ?? 'unknown';
                            $cnt = (int) $ls['count'];
                            $col = $statusColors[$st] ?? '#94a3b8';
                        ?>
                        <li class="status-item">
                            <span>
                                <span class="status-dot" style="background:<?= $col ?>"></span>
                                <?= htmlspecialchars(ucfirst(str_replace('_', ' ', $st)), ENT_QUOTES, 'UTF-8') ?>
                            </span>
                            <span class="count"><?= $cnt ?></span>
                        </li>
                        <?php endforeach; ?>
                    </ul>
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
                        <span><span class="status-dot" style="background:#f59e0b"></span>Pending / In Progress</span>
                        <span class="count"><?= $pendingTasks ?></span>
                    </li>
                </ul>
                <div style="margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border);font-size:.85rem;">
                    <strong>Today:</strong> <?= $todayCompleted ?> task<?= $todayCompleted !== 1 ? 's' : '' ?> completed
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
        <div class="card-header">
            <h3>Recent Activity</h3>
            <span class="text-sm text-muted">Last 10 actions</span>
        </div>
        <div class="card-body no-pad">
            <?php if (empty($recentActivity)): ?>
                <div class="empty-state">
                    <p>No recent activity</p>
                </div>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Module</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recentActivity as $act): ?>
                        <tr>
                            <td class="fw-600"><?= htmlspecialchars($act['user_name'] ?? 'System', ENT_QUOTES, 'UTF-8') ?></td>
                            <td><?= htmlspecialchars($act['action'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                            <td><span class="badge badge-gray"><?= htmlspecialchars($act['module'] ?? '', ENT_QUOTES, 'UTF-8') ?></span></td>
                            <td class="text-muted text-sm" data-time="<?= htmlspecialchars($act['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($act['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</main>

<script src="<?= CRM_BASE_PATH ?>/assets/js/dashboard.js"></script>
</body>
</html>
