<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role(['admin', 'sub_admin']);
$user = current_user();
$pageTitle = 'Clients';
$activePage = 'clients';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Clients</h2><p>Manage all client records.</p></div>
        <button onclick="addClient()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Client
        </button>
    </div>
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
    CRM.api('GET', 'clients?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message || 'Failed', 'error'); return; }
        CRM.renderTable('table-container', [
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'company', label: 'Company' },
            { key: 'status', label: 'Status', badge: CRM.statusBadge }
        ], res.data, [
            { label: 'Edit', handler: 'editClient' },
            { label: 'Delete', handler: 'deleteClient', danger: true }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadClients');
    });
}
function addClient() {
    var html = CRM.field('Name','name','','text',{required:true})
        + CRM.field('Phone','phone','','tel',{required:true})
        + CRM.field('Email','email','','email')
        + CRM.field('Company','company','','text')
        + CRM.field('Address','address','','textarea')
        + CRM.field('Status','status','active','select',{options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'prospect',label:'Prospect'}]});
    CRM.openModal('Add Client', html, function(data) {
        CRM.api('POST','clients',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Client created'), loadClients(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
function editClient(id) {
    CRM.api('GET','clients?limit=500').then(function(res) {
        var c = (res.data||[]).find(function(x){return x.id==id;});
        if (!c) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Name','name',c.name,'text',{required:true})
            + CRM.field('Phone','phone',c.phone,'tel',{required:true})
            + CRM.field('Email','email',c.email||'','email')
            + CRM.field('Company','company',c.company||'','text')
            + CRM.field('Address','address',c.address||'','textarea')
            + CRM.field('Status','status',c.status,'select',{options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'prospect',label:'Prospect'}]});
        CRM.openModal('Edit Client', html, function(data) {
            data.id = id;
            CRM.api('PUT','clients',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Client updated'), loadClients(currentPage)) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
function deleteClient(id) {
    CRM.confirm('Delete this client?', function() {
        CRM.api('DELETE','clients',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Client deleted'), loadClients(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
CRM.renderSearchBar('search-bar','Search clients...',function(q){ currentSearch=q; loadClients(1); });
loadClients(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
