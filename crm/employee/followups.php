<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'My Follow-Ups';
$activePage = 'followups';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>My Follow-Ups</h2><p>Scheduled follow-ups for your leads and clients.</p></div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '', loadedRows = [];

function loadFollowUps(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','followups?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        loadedRows = res.data || [];
        CRM.renderTable('table-container', [
            { key:'lead_name', label:'Lead / Client' },
            { key:'type', label:'Type' },
            { key:'scheduled_at', label:'Scheduled' },
            { key:'status', label:'Status', badge: CRM.statusBadge },
            { key:'notes', label:'Notes' }
        ], loadedRows, [{ label: 'Update', handler: 'openEdit' }]);
        CRM.renderPagination('pagination', res.pagination, 'loadFollowUps');
    });
}

function openEdit(id) {
    var fu = loadedRows.find(function(f) { return f.id == id; });
    if (!fu) { CRM.toast('Follow-up not found', 'error'); return; }
    var html = CRM.field('Status', 'status', fu.status || 'pending', 'select', {
            options: [
                { value: 'pending',   label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'missed',    label: 'Missed' }
            ]
        })
        + CRM.field('Notes', 'notes', fu.notes || '', 'textarea');
    CRM.openModal('Update Follow-Up', html, function(data) {
        CRM.api('PUT', 'followups', { id: id, status: data.status, notes: data.notes }).then(function(res) {
            CRM.closeModal();
            if (res.success) { CRM.toast('Follow-up updated', 'success'); loadFollowUps(currentPage); }
            else CRM.toast(res.message || 'Error', 'error');
        });
    });
}

CRM.renderSearchBar('search-bar','Search follow-ups...',function(q){ currentSearch=q; loadFollowUps(1); });
loadFollowUps(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
