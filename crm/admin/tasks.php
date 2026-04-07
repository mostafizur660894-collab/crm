<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('admin');
$user = current_user();
$pageTitle = 'Tasks';
$activePage = 'tasks';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Tasks</h2><p>Assign and track tasks across your team.</p></div>
        <button onclick="addTask()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Task
        </button>
    </div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        <div id="pagination"></div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '', employees = [];

// Pre-load employees for assignment dropdown
CRM.api('GET','users?limit=200').then(function(res) {
    employees = (res.data||[]).map(function(u){ return {value:u.id,label:u.name+' ('+u.role+')'}; });
    loadTasks(1);
});

function loadTasks(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET','tasks?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'title', label:'Title' },
            { key:'assigned_to_name', label:'Assigned To', render: function(v){ return CRM.escapeHtml(v||'Unassigned'); } },
            { key:'due_date', label:'Due Date', render: function(v){ return v ? CRM.escapeHtml(v.substring(0,10)) : '—'; } },
            { key:'priority', label:'Priority', badge: CRM.priorityBadge },
            { key:'status', label:'Status', badge: CRM.statusBadge }
        ], res.data, [
            { label:'Edit', handler:'editTask' },
            { label:'Delete', handler:'deleteTask', danger:true }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadTasks');
    });
}

function addTask() {
    var html = CRM.field('Title','title','','text',{required:true})
        + CRM.field('Description','description','','textarea')
        + CRM.field('Assigned To','assigned_to','','select',{required:true, options:[{value:'',label:'Select...'}].concat(employees)})
        + CRM.field('Due Date','due_date','','date')
        + CRM.field('Reminder','reminder_at','','datetime-local')
        + CRM.field('Priority','priority','medium','select',{options:[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'}]})
        + CRM.field('Points','points','0','number');
    CRM.openModal('Add Task', html, function(data) {
        CRM.api('POST','tasks',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Task created'), loadTasks(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}

function editTask(id) {
    CRM.api('GET','tasks?limit=500').then(function(res) {
        var t = (res.data||[]).find(function(x){return x.id==id;});
        if (!t) { CRM.toast('Not found','error'); return; }
        var html = CRM.field('Title','title',t.title,'text',{required:true})
            + CRM.field('Description','description',t.description||'','textarea')
            + CRM.field('Assigned To','assigned_to',t.assigned_to||'','select',{required:true, options:[{value:'',label:'Select...'}].concat(employees)})
            + CRM.field('Due Date','due_date',(t.due_date||'').substring(0,10),'date')
            + CRM.field('Reminder','reminder_at',(t.reminder_at||'').substring(0,16),'datetime-local')
            + CRM.field('Priority','priority',t.priority||'medium','select',{options:[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'}]})
            + CRM.field('Status','status',t.status,'select',{options:[{value:'pending',label:'Pending'},{value:'in_progress',label:'In Progress'},{value:'completed',label:'Completed'},{value:'cancelled',label:'Cancelled'}]})
            + CRM.field('Points','points',t.points||'0','number');
        CRM.openModal('Edit Task', html, function(data) {
            data.id = id;
            CRM.api('PUT','tasks',data).then(function(res) {
                CRM.closeModal();
                res.success ? (CRM.toast('Task updated'), loadTasks(currentPage)) : CRM.toast(res.message||'Error','error');
            });
        });
    });
}

function deleteTask(id) {
    CRM.confirm('Delete this task?', function() {
        CRM.api('DELETE','tasks',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Task deleted'), loadTasks(currentPage)) : CRM.toast(res.message||'Error','error');
        });
    });
}
CRM.renderSearchBar('search-bar','Search tasks...',function(q){ currentSearch=q; loadTasks(1); });
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
