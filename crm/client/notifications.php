<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('client');
$user = current_user();
$pageTitle = 'Notifications';
$activePage = 'notifications';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';

$db = db_connect();
$uid = (int)$user['id'];
$rows = $db->query("SELECT * FROM notifications WHERE user_id=$uid ORDER BY created_at DESC LIMIT 50");
// Mark all as read
$db->query("UPDATE notifications SET is_read=1 WHERE user_id=$uid AND is_read=0");
?>
<main class="main-content">
    <div class="page-header"><h2>Notifications</h2><p>Your latest notifications.</p></div>
    <div class="card">
        <div class="card-body">
            <?php if ($rows->num_rows === 0): ?>
                <div class="empty-state"><p>No notifications yet.</p></div>
            <?php else: while ($n = $rows->fetch_assoc()): ?>
                <div class="notification-item" style="padding:1rem;border-bottom:1px solid var(--border);<?= empty($n['is_read']) ? 'background:var(--light)' : '' ?>">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong><?= htmlspecialchars($n['title'] ?? 'Notification') ?></strong>
                        <small style="color:var(--text-light)"><?= htmlspecialchars($n['created_at']) ?></small>
                    </div>
                    <p style="margin:0.5rem 0 0;color:var(--text-light)"><?= htmlspecialchars($n['message'] ?? $n['body'] ?? '') ?></p>
                </div>
            <?php endwhile; endif; ?>
        </div>
    </div>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
