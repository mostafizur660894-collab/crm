<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'My Clients';
$activePage = 'clients';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>My Clients</h2><p>Clients assigned to you.</p></div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '';
function loadClients(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','clients?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'name', label:'Name' },
            { key:'phone', label:'Phone' },
            { key:'email', label:'Email' },
            { key:'company', label:'Company' },
            { key:'status', label:'Status', badge: CRM.statusBadge }
        ], res.data, null);
        CRM.renderPagination('pagination', res.pagination, 'loadClients');
    });
}
CRM.renderSearchBar('search-bar','Search my clients...',function(q){ currentSearch=q; loadClients(1); });
loadClients(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
