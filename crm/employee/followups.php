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
<div class="modal-overlay" id="modal"><div class="modal"><div class="modal-header"><h3 id="modal-title">Follow-Up</h3><button class="btn btn-sm" onclick="CRM.closeModal()">&times;</button></div><form id="modal-form" onsubmit="return saveFollowUp(event)"><div class="modal-body" id="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="CRM.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div></div>
<script>
var currentPage = 1, currentSearch = '', editId = 0;
function loadFollowUps(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','followups?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'lead_name', label:'Lead / Client' },
            { key:'type', label:'Type' },
            { key:'scheduled_at', label:'Scheduled' },
            { key:'status', label:'Status', badge: CRM.statusBadge },
            { key:'notes', label:'Notes' }
        ], res.data, function(row) {
            return '<button class="btn btn-sm btn-primary" onclick="openEdit('+row.id+',\''+
                (row.status||'pending').replace(/'/g,"\\'")+'\',\''+
                (row.notes||'').replace(/'/g,"\\'").replace(/\n/g,' ')+'\')">Update</button>';
        });
        CRM.renderPagination('pagination', res.pagination, 'loadFollowUps');
    });
}
function openEdit(id, status, notes) {
    editId = id;
    document.getElementById('modal-body').innerHTML =
        CRM.field('status','Status','select',status,[
            {v:'pending',l:'Pending'},{v:'completed',l:'Completed'},{v:'missed',l:'Missed'}
        ]) +
        CRM.field('notes','Notes','textarea',notes);
    CRM.openModal('Update Follow-Up');
}
function saveFollowUp(e) {
    e.preventDefault();
    var body = { id: editId, status: document.getElementById('field-status').value, notes: document.getElementById('field-notes').value };
    CRM.api('PUT','followups',body).then(function(res){
        if(res.success){ CRM.toast('Updated','success'); CRM.closeModal(); loadFollowUps(currentPage); }
        else CRM.toast(res.message||'Failed','error');
    });
    return false;
}
CRM.renderSearchBar('search-bar','Search follow-ups...',function(q){ currentSearch=q; loadFollowUps(1); });
loadFollowUps(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
