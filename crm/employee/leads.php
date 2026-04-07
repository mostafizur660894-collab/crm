<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'My Leads';
$activePage = 'leads';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>My Leads</h2><p>Leads assigned to you.</p></div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '';
function loadLeads(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','leads?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'name', label:'Name' },
            { key:'phone', label:'Phone' },
            { key:'email', label:'Email' },
            { key:'company', label:'Company' },
            { key:'status', label:'Status', badge: CRM.statusBadge }
        ], res.data, [
            { label:'Edit', handler:'editLead' }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadLeads');
    });
}
function editLead(id) {
    CRM.api('GET','leads?limit=500').then(function(res) {
        var l = (res.data||[]).find(function(x){return x.id==id;});
        if (!l) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Status','status',l.status,'select',{options:[
            {value:'new',label:'New'},{value:'contacted',label:'Contacted'},{value:'qualified',label:'Qualified'},
            {value:'proposal',label:'Proposal'},{value:'negotiation',label:'Negotiation'}
        ]}) + CRM.field('Notes','notes',l.notes||'','textarea');
        CRM.openModal('Update Lead', html, function(data) {
            data.id = id;
            CRM.api('PUT','leads',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Lead updated'), loadLeads(currentPage)) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
CRM.renderSearchBar('search-bar','Search my leads...',function(q){ currentSearch=q; loadLeads(1); });
loadLeads(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
