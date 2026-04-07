<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role(['admin', 'sub_admin']);
$user = current_user();
$pageTitle = 'Categories';
$activePage = 'categories';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Categories</h2><p>Organize leads, tasks, and clients by category.</p></div>
        <button onclick="addCategory()" class="btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Category
        </button>
    </div>
    <div class="card">
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
    </div>
</main>
<script>
function loadCategories() {
    CRM.api('GET','categories').then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'name', label:'Name' },
            { key:'description', label:'Description' },
            { key:'is_active', label:'Active', render: function(v){ return v==1?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-gray">No</span>'; } }
        ], res.data, [
            { label:'Edit', handler:'editCategory' },
            { label:'Delete', handler:'deleteCategory', danger:true }
        ]);
    });
}
function addCategory() {
    var html = CRM.field('Name','name','','text',{required:true})
        + CRM.field('Description','description','','textarea');
    CRM.openModal('Add Category', html, function(data) {
        CRM.api('POST','categories',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Category created'), loadCategories()) : CRM.toast(res.message||'Error','error');
        });
    });
}
function editCategory(id) {
    CRM.api('GET','categories').then(function(res) {
        var c = (res.data||[]).find(function(x){return x.id==id;});
        if (!c) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Name','name',c.name,'text',{required:true})
            + CRM.field('Description','description',c.description||'','textarea')
            + CRM.field('Active','is_active',c.is_active!=null?String(c.is_active):'1','select',{options:[{value:'1',label:'Yes'},{value:'0',label:'No'}]});
        CRM.openModal('Edit Category', html, function(data) {
            data.id = id;
            CRM.api('PUT','categories',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Category updated'), loadCategories()) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}
function deleteCategory(id) {
    CRM.confirm('Delete this category?', function() {
        CRM.api('DELETE','categories',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Category deleted'), loadCategories()) : CRM.toast(res.message||'Error','error');
        });
    });
}
loadCategories();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
