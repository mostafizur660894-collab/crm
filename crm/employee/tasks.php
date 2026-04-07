<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'My Tasks';
$activePage = 'tasks';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>My Tasks</h2><p>Tasks assigned to you.</p></div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '', loadedRows = [];

function loadTasks(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','tasks?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        loadedRows = res.data || [];
        CRM.renderTable('table-container', [
            { key:'title', label:'Title' },
            { key:'priority', label:'Priority', badge: CRM.priorityBadge },
            { key:'status', label:'Status', badge: CRM.statusBadge },
            { key:'due_date', label:'Due Date' }
        ], loadedRows, [{ label: 'Update Status', handler: 'openEdit' }]);
        CRM.renderPagination('pagination', res.pagination, 'loadTasks');
    });
}

function openEdit(id) {
    var task = loadedRows.find(function(t) { return t.id == id; });
    if (!task) { CRM.toast('Task not found', 'error'); return; }
    var html = CRM.field('Status', 'status', task.status || 'pending', 'select', {
        options: [
            { value: 'pending',     label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed',   label: 'Completed' }
        ]
    });
    CRM.openModal('Update Task Status', html, function(data) {
        CRM.api('PUT', 'tasks', { id: id, status: data.status }).then(function(res) {
            CRM.closeModal();
            if (res.success) { CRM.toast('Status updated', 'success'); loadTasks(currentPage); }
            else CRM.toast(res.message || 'Error', 'error');
        });
    });
}

CRM.renderSearchBar('search-bar','Search tasks...',function(q){ currentSearch=q; loadTasks(1); });
loadTasks(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
