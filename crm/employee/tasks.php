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
<div class="modal-overlay" id="modal"><div class="modal"><div class="modal-header"><h3 id="modal-title">Update Task</h3><button class="btn btn-sm" onclick="CRM.closeModal()">&times;</button></div><form id="modal-form" onsubmit="return updateTask(event)"><div class="modal-body" id="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="CRM.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div></div>
<script>
var currentPage = 1, currentSearch = '', editId = 0;
function loadTasks(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','tasks?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'title', label:'Title' },
            { key:'priority', label:'Priority', badge: CRM.priorityBadge },
            { key:'status', label:'Status', badge: CRM.statusBadge },
            { key:'due_date', label:'Due Date' }
        ], res.data, function(row) {
            return '<button class="btn btn-sm btn-primary" onclick="openEdit('+row.id+',\''+
                (row.status||'pending').replace(/'/g,"\\'")+'\')">Update Status</button>';
        });
        CRM.renderPagination('pagination', res.pagination, 'loadTasks');
    });
}
function openEdit(id, status) {
    editId = id;
    document.getElementById('modal-body').innerHTML =
        CRM.field('status','Status','select',status,[
            {v:'pending',l:'Pending'},{v:'in_progress',l:'In Progress'},
            {v:'completed',l:'Completed'}
        ]);
    CRM.openModal('Update Task Status');
}
function updateTask(e) {
    e.preventDefault();
    var s = document.getElementById('field-status').value;
    CRM.api('PUT','tasks',{ id: editId, status: s }).then(function(res){
        if(res.success){ CRM.toast('Updated','success'); CRM.closeModal(); loadTasks(currentPage); }
        else CRM.toast(res.message||'Failed','error');
    });
    return false;
}
CRM.renderSearchBar('search-bar','Search tasks...',function(q){ currentSearch=q; loadTasks(1); });
loadTasks(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
