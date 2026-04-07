<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role(['admin', 'sub_admin']);
$user = current_user();
$pageTitle = 'Employees';
$activePage = 'users';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Employees</h2><p>Manage user accounts and roles.</p></div>
        <button onclick="addUser()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add User
        </button>
    </div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '', branches = [];
CRM.api('GET','branches').then(function(res) { branches = (res.data||[]).map(function(b){return {value:b.id,label:b.name};}); loadUsers(1); });

function loadUsers(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','users?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'name', label:'Name' },
            { key:'email', label:'Email' },
            { key:'role', label:'Role', badge: function(v){ return v==='admin'?'badge-danger':v==='employee'?'badge-info':'badge-gray'; } },
            { key:'branch_name', label:'Branch' },
            { key:'is_active', label:'Active', render: function(v){ return v==1?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-gray">No</span>'; } }
        ], res.data, [
            { label:'Edit', handler:'editUser' },
            { label:'Delete', handler:'deleteUser', danger:true }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadUsers');
    });
}
function addUser() {
    var roles = [{value:'employee',label:'Employee'},{value:'sub_admin',label:'Sub Admin'},{value:'client',label:'Client'}];
    var html = CRM.field('Name','name','','text',{required:true})
        + CRM.field('Email','email','','email',{required:true})
        + CRM.field('Password','password','','password',{required:true})
        + CRM.field('Role','role','employee','select',{options:roles})
        + CRM.field('Phone','phone','','tel')
        + CRM.field('Branch','branch_id','','select',{options:[{value:'',label:'Select...'}].concat(branches)});
    CRM.openModal('Add User', html, function(data) {
        CRM.api('POST','users',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('User created'), loadUsers(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
function editUser(id) {
    CRM.api('GET','users?limit=500').then(function(res) {
        var u = (res.data||[]).find(function(x){return x.id==id;});
        if (!u) { CRM.toast('Not found','error'); return; }
        var roles = [{value:'employee',label:'Employee'},{value:'sub_admin',label:'Sub Admin'},{value:'admin',label:'Admin'},{value:'client',label:'Client'}];
        var html = CRM.field('Name','name',u.name,'text',{required:true})
            + CRM.field('Email','email',u.email,'email',{required:true})
            + CRM.field('Password (leave blank to keep)','password','','password')
            + CRM.field('Role','role',u.role,'select',{options:roles})
            + CRM.field('Phone','phone',u.phone||'','tel')
            + CRM.field('Branch','branch_id',u.branch_id||'','select',{options:[{value:'',label:'Select...'}].concat(branches)})
            + CRM.field('Active','is_active',u.is_active!=null?String(u.is_active):'1','select',{options:[{value:'1',label:'Yes'},{value:'0',label:'No'}]});
        CRM.openModal('Edit User', html, function(data) {
            data.id = id;
            if (!data.password) delete data.password;
            CRM.api('PUT','users',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('User updated'), loadUsers(currentPage)) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
function deleteUser(id) {
    CRM.confirm('Delete this user?', function() {
        CRM.api('DELETE','users',{id:id}).then(function(res) {
            res.success ? (CRM.toast('User deleted'), loadUsers(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
CRM.renderSearchBar('search-bar','Search users...',function(q){ currentSearch=q; loadUsers(1); });
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
