<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('employee');
$user = current_user();
$pageTitle = 'Leaderboard';
$activePage = 'leaderboard';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header"><h2>Leaderboard</h2><p>See how you rank among your peers.</p></div>
    <div class="card">
        <div class="card-header">
            <select id="period" class="form-control" style="width:auto;display:inline-block" onchange="loadBoard()">
                <option value="all">All Time</option>
                <option value="month" selected>This Month</option>
                <option value="week">This Week</option>
                <option value="today">Today</option>
            </select>
        </div>
        <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
    </div>
</main>
<script>
function loadBoard() {
    var p = document.getElementById('period').value;
    CRM.api('GET','leaderboard?period=' + p).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'rank', label:'#' },
            { key:'name', label:'Employee' },
            { key:'points', label:'Points' },
            { key:'leads_converted', label:'Conversions' },
            { key:'tasks_completed', label:'Tasks Done' }
        ], (res.data||[]).map(function(r,i){ r.rank=i+1; return r; }), null);
    });
}
loadBoard();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
