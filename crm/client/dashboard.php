<?php
/**
 * Client Dashboard
 * Bimano CRM — client/dashboard.php
 *
 * Only accessible to users with role = 'client'.
 */

declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

require_role('client');

$user       = current_user();
$pageTitle  = 'Client Dashboard';
$activePage = 'dashboard';
$userId     = (int) $user['id'];

// ── Fetch client data ─────────────────────────────────────────────────────────
$conn = db_connect();

$clientData  = null;
$followUps   = [];
$notifications = [];

// Get user email
$stmt = @$conn->prepare('SELECT `email` FROM `users` WHERE `id` = ? LIMIT 1');
if ($stmt) {
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $userEmail = $row['email'] ?? null;

    if ($userEmail) {
        // Find linked client record
        $stmt2 = @$conn->prepare('SELECT `id`, `name`, `email`, `phone`, `company`, `status` FROM `clients` WHERE `email` = ? LIMIT 1');
        if ($stmt2) {
            $stmt2->bind_param('s', $userEmail);
            $stmt2->execute();
            $clientRow = $stmt2->get_result()->fetch_assoc();
            $stmt2->close();

            if ($clientRow) {
                $clientData = $clientRow;
                $clientId   = (int) $clientRow['id'];

                // Follow-ups for this client
                $stmt3 = @$conn->prepare(
                    "SELECT f.`followup_date`, f.`note`, f.`status`, u.`name` as `assigned_to_name`
                     FROM `follow_ups` f
                     LEFT JOIN `users` u ON f.`assigned_to` = u.`id`
                     WHERE f.`client_id` = ?
                     ORDER BY f.`followup_date` DESC
                     LIMIT 10"
                );
                if ($stmt3) {
                    $stmt3->bind_param('i', $clientId);
                    $stmt3->execute();
                    $res = $stmt3->get_result();
                    while ($r = $res->fetch_assoc()) $followUps[] = $r;
                    $stmt3->close();
                }
            }
        }
    }
}

// Notifications
$stmt4 = @$conn->prepare(
    "SELECT `title`, `message`, `type`, `is_read`, `created_at`
     FROM `notifications`
     WHERE `user_id` = ? AND `is_read` = 0
     ORDER BY `created_at` DESC
     LIMIT 10"
);
if ($stmt4) {
    $stmt4->bind_param('i', $userId);
    $stmt4->execute();
    $res4 = $stmt4->get_result();
    while ($r = $res4->fetch_assoc()) $notifications[] = $r;
    $stmt4->close();
}

$conn->close();

// ── Render ────────────────────────────────────────────────────────────────────
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>

<main class="main-content">
    <div class="page-header">
        <h2>Welcome, <?= htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') ?></h2>
        <p>Your client portal — view your information and follow-ups.</p>
    </div>

    <!-- Profile Card -->
    <div class="content-grid">
        <div class="card">
            <div class="card-header">
                <h3>My Profile</h3>
                <?php if ($clientData): ?>
                    <?php
                    $statusBadge = match($clientData['status'] ?? '') {
                        'active'   => 'badge-success',
                        'inactive' => 'badge-gray',
                        'prospect' => 'badge-info',
                        default    => 'badge-gray',
                    };
                    ?>
                    <span class="badge <?= $statusBadge ?>"><?= htmlspecialchars(ucfirst($clientData['status'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></span>
                <?php endif; ?>
            </div>
            <div class="card-body">
                <?php if ($clientData): ?>
                    <table class="data-table">
                        <tr><th style="width:120px">Name</th><td class="fw-600"><?= htmlspecialchars($clientData['name'] ?? '', ENT_QUOTES, 'UTF-8') ?></td></tr>
                        <tr><th>Email</th><td><?= htmlspecialchars($clientData['email'] ?? '', ENT_QUOTES, 'UTF-8') ?></td></tr>
                        <tr><th>Phone</th><td><?= htmlspecialchars($clientData['phone'] ?? '—', ENT_QUOTES, 'UTF-8') ?></td></tr>
                        <tr><th>Company</th><td><?= htmlspecialchars($clientData['company'] ?? '—', ENT_QUOTES, 'UTF-8') ?></td></tr>
                    </table>
                <?php else: ?>
                    <div class="empty-state"><p>No client profile linked to your account yet.</p></div>
                <?php endif; ?>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Notifications</h3>
                <span class="badge badge-warning"><?= count($notifications) ?> unread</span>
            </div>
            <div class="card-body">
                <?php if (empty($notifications)): ?>
                    <div class="empty-state"><p>You're all caught up!</p></div>
                <?php else: ?>
                    <?php foreach ($notifications as $n): ?>
                    <div class="activity-item">
                        <div class="activity-icon" style="background:var(--info-bg);color:var(--info);">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        </div>
                        <div class="activity-text">
                            <strong><?= htmlspecialchars($n['title'] ?? '', ENT_QUOTES, 'UTF-8') ?></strong><br>
                            <span class="text-muted text-sm"><?= htmlspecialchars(mb_strimwidth($n['message'] ?? '', 0, 80, '…'), ENT_QUOTES, 'UTF-8') ?></span>
                            <div class="activity-time" data-time="<?= htmlspecialchars($n['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($n['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Follow-ups -->
    <div class="card">
        <div class="card-header">
            <h3>My Follow-ups</h3>
            <span class="badge badge-primary"><?= count($followUps) ?> records</span>
        </div>
        <div class="card-body no-pad">
            <?php if (empty($followUps)): ?>
                <div class="empty-state"><p>No follow-ups recorded yet.</p></div>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Assigned To</th>
                            <th>Note</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($followUps as $fu): ?>
                        <?php
                        $fuBadge = match($fu['status'] ?? '') {
                            'completed' => 'badge-success',
                            'pending'   => 'badge-warning',
                            'cancelled' => 'badge-danger',
                            default     => 'badge-gray',
                        };
                        ?>
                        <tr>
                            <td class="text-sm"><?= htmlspecialchars(date('M j, Y', strtotime($fu['followup_date'])), ENT_QUOTES, 'UTF-8') ?></td>
                            <td class="fw-600"><?= htmlspecialchars($fu['assigned_to_name'] ?? '—', ENT_QUOTES, 'UTF-8') ?></td>
                            <td class="text-muted text-sm"><?= htmlspecialchars(mb_strimwidth($fu['note'] ?? '', 0, 60, '…'), ENT_QUOTES, 'UTF-8') ?></td>
                            <td><span class="badge <?= $fuBadge ?>"><?= htmlspecialchars(ucfirst($fu['status'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
