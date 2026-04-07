<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('admin');
$user = current_user();
$pageTitle = 'Follow-ups';
$activePage = 'followups';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Follow-ups</h2><p>Schedule and manage follow-ups with leads and clients.</p></div>
        <button onclick="addFollowup()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Follow-up
        </button>
    </div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1;
function loadFollowups(page) {
    page = page || 1; currentPage = page;
    CRM.api('GET','followups?limit=25&page=' + page).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'lead_name', label:'Lead', render: function(v,r){ return CRM.escapeHtml(v || r.client_name || '—'); } },
            { key:'assigned_to_name', label:'Assigned To' },
            { key:'followup_date', label:'Date', render: function(v){ return v ? CRM.escapeHtml(v.substring(0,16).replace('T',' ')) : '—'; } },
            { key:'note', label:'Note', render: function(v){ return CRM.escapeHtml((v||'').substring(0,50)); } },
            { key:'status', label:'Status', badge: CRM.statusBadge }
        ], res.data, [
            { label:'Edit', handler:'editFollowup' },
            { label:'Delete', handler:'deleteFollowup', danger:true }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadFollowups');
    });
}
function addFollowup() {
    var html = CRM.field('Follow-up Date','followup_date','','datetime-local',{required:true})
        + CRM.field('Note','note','','textarea',{placeholder:'Follow-up details...'})
        + CRM.field('Status','status','pending','select',{options:[{value:'pending',label:'Pending'},{value:'completed',label:'Completed'},{value:'cancelled',label:'Cancelled'}]});
    CRM.openModal('Add Follow-up', html, function(data) {
        CRM.api('POST','followups',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Follow-up created'), loadFollowups(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
function editFollowup(id) {
    CRM.api('GET','followups?limit=500').then(function(res) {
        var f = (res.data||[]).find(function(x){return x.id==id;});
        if (!f) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Follow-up Date','followup_date',(f.followup_date||'').substring(0,16),'datetime-local',{required:true})
            + CRM.field('Note','note',f.note||'','textarea')
            + CRM.field('Status','status',f.status,'select',{options:[{value:'pending',label:'Pending'},{value:'completed',label:'Completed'},{value:'cancelled',label:'Cancelled'}]});
        CRM.openModal('Edit Follow-up', html, function(data) {
            data.id = id;
            CRM.api('PUT','followups',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Follow-up updated'), loadFollowups(currentPage)) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
function deleteFollowup(id) {
    CRM.confirm('Delete this follow-up?', function() {
        CRM.api('DELETE','followups',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Follow-up deleted'), loadFollowups(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
loadFollowups(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
