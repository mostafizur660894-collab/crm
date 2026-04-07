<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'My Points';
$activePage = 'points';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';

$db = db_connect();
$uid = (int)$user['id'];
$total = $db->query("SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id=$uid")->fetch_assoc()['total'];
$month = $db->query("SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id=$uid AND created_at >= DATE_FORMAT(NOW(),'%Y-%m-01')")->fetch_assoc()['total'];
$rows = $db->query("SELECT * FROM points_ledger WHERE user_id=$uid ORDER BY created_at DESC LIMIT 50");
?>
<main class="main-content">
    <div class="page-header"><h2>My Points</h2><p>Track your earned points and rewards.</p></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Total Points</div><div class="stat-value"><?= (int)$total ?></div></div>
        <div class="stat-card"><div class="stat-label">This Month</div><div class="stat-value"><?= (int)$month ?></div></div>
    </div>
    <div class="card">
        <div class="card-header"><h3>Points History</h3></div>
        <div class="card-body no-pad">
            <table><thead><tr><th>Date</th><th>Reason</th><th>Points</th></tr></thead><tbody>
            <?php if ($rows->num_rows === 0): ?>
                <tr><td colspan="3" style="text-align:center;padding:2rem">No points yet.</td></tr>
            <?php else: while ($r = $rows->fetch_assoc()): ?>
                <tr>
                    <td><?= htmlspecialchars($r['created_at']) ?></td>
                    <td><?= htmlspecialchars($r['reason'] ?? $r['description'] ?? '-') ?></td>
                    <td><span class="badge <?= $r['points'] >= 0 ? 'badge-success' : 'badge-danger' ?>"><?= $r['points'] >= 0 ? '+' : '' ?><?= (int)$r['points'] ?></span></td>
                </tr>
            <?php endwhile; endif; ?>
            </tbody></table>
        </div>
    </div>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
