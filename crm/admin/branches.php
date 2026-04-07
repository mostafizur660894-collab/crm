<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role(['admin', 'sub_admin']);
$user = current_user();
$pageTitle = 'Branches';
$activePage = 'branches';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Branches</h2><p>Manage office branches.</p></div>
        <button onclick="addBranch()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Branch
        </button>
    </div>
    <div class="card">
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
    </div>
</main>
<script>
function loadBranches() {
    CRM.api('GET','branches').then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'name', label:'Name' },
            { key:'city', label:'City' },
            { key:'state', label:'State' },
            { key:'phone', label:'Phone' },
            { key:'email', label:'Email' },
            { key:'is_active', label:'Active', render: function(v){ return v==1?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-gray">No</span>'; } }
        ], res.data, [
            { label:'Edit', handler:'editBranch' },
            { label:'Delete', handler:'deleteBranch', danger:true }
        ]);
    });
}
function addBranch() {
    var html = CRM.field('Name','name','','text',{required:true})
        + CRM.field('Address','address','','text')
        + CRM.field('City','city','','text')
        + CRM.field('State','state','','text')
        + CRM.field('Phone','phone','','tel')
        + CRM.field('Email','email','','email');
    CRM.openModal('Add Branch', html, function(data) {
        CRM.api('POST','branches',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Branch created'), loadBranches()) : CRM.toast(res.message||'Error','error');
        });
    });
}
function editBranch(id) {
    CRM.api('GET','branches').then(function(res) {
        var b = (res.data||[]).find(function(x){return x.id==id;});
        if (!b) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Name','name',b.name,'text',{required:true})
            + CRM.field('Address','address',b.address||'','text')
            + CRM.field('City','city',b.city||'','text')
            + CRM.field('State','state',b.state||'','text')
            + CRM.field('Phone','phone',b.phone||'','tel')
            + CRM.field('Email','email',b.email||'','email')
            + CRM.field('Active','is_active',b.is_active!=null?String(b.is_active):'1','select',{options:[{value:'1',label:'Yes'},{value:'0',label:'No'}]});
        CRM.openModal('Edit Branch', html, function(data) {
            data.id = id;
            CRM.api('PUT','branches',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Branch updated'), loadBranches()) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
function deleteBranch(id) {
    CRM.confirm('Delete this branch?', function() {
        CRM.api('DELETE','branches',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Branch deleted'), loadBranches()) : CRM.toast(res.message||'Error','error');
        });
    });
}
loadBranches();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
