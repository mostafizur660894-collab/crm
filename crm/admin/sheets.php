<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role(['admin', 'sub_admin']);
$user = current_user();
$pageTitle = 'Sheets';
$activePage = 'sheets';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div><h2>Google Sheets</h2><p>Link and manage Google Sheets integrations.</p></div>
        <button onclick="addSheet()" class="btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Link Sheet
        </button>
    </div>
    <div class="card">
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
    </div>
</main>
<script>
function loadSheets() {
    CRM.api('GET','sheets').then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'sheet_name', label:'Name' },
            { key:'sheet_id', label:'Sheet ID', render: function(v){ return '<code style="font-size:.78rem;background:var(--bg-elevated);padding:2px 6px;border-radius:4px;color:var(--text);">'  + CRM.escapeHtml(v||'') + '</code>'; } },
            { key:'added_by_name', label:'Added By' },
            { key:'created_at', label:'Added', render: function(v){ return v ? CRM.escapeHtml(v.substring(0,10)) : '—'; } }
        ], res.data, [
            { label:'Delete', handler:'deleteSheet', danger:true }
        ]);
    });
}
function addSheet() {
    var html = CRM.field('Sheet Name','sheet_name','','text',{required:true, placeholder:'My Report Sheet'})
        + CRM.field('Google Sheet URL','sheet_url','','text',{required:true, placeholder:'https://docs.google.com/spreadsheets/d/...'});
    CRM.openModal('Link Google Sheet', html, function(data) {
        CRM.api('POST','sheets',data).then(function(res) {
            CRM.closeModal();
            res.success ? (CRM.toast('Sheet linked'), loadSheets()) : CRM.toast(res.message||'Error','error');
        });
    });
}
function deleteSheet(id) {
    CRM.confirm('Remove this sheet?', function() {
        CRM.api('DELETE','sheets',{id:id}).then(function(res) {
            res.success ? (CRM.toast('Sheet removed'), loadSheets()) : CRM.toast(res.message||'Error','error');
        });
    });
}
loadSheets();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
