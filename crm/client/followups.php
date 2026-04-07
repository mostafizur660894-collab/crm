<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('client');
$user = current_user();
$pageTitle = 'My Follow-Ups';
$activePage = 'followups';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>My Follow-Ups</h2><p>Scheduled follow-up communications with your account.</p></div>
    <div class="card">
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1;
function loadFollowUps(page) {
    page = page || 1; currentPage = page;
    CRM.api('GET','followups?limit=25&page=' + page).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'type', label:'Type' },
            { key:'scheduled_at', label:'Scheduled' },
            { key:'status', label:'Status', badge: CRM.statusBadge },
            { key:'notes', label:'Notes' }
        ], res.data, null);
        CRM.renderPagination('pagination', res.pagination, 'loadFollowUps');
    });
}
loadFollowUps(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
