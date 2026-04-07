<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('admin');
$user = current_user();
$pageTitle = 'Leaderboard';
$activePage = 'leaderboard';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header">
        <h2>Leaderboard</h2>
        <p>Employee rankings by points and task completion.</p>
    </div>

    <div class="card" style="margin-bottom:1.5rem;">
        <div class="card-header">
            <h3>Filter by Period</h3>
        </div>
        <div class="card-body">
            <div class="quick-actions">
                <button onclick="loadBoard('all')" class="quick-action-btn" id="btn-all">All Time</button>
                <button onclick="loadBoard('month')" class="quick-action-btn" id="btn-month">This Month</button>
                <button onclick="loadBoard('week')" class="quick-action-btn" id="btn-week">This Week</button>
                <button onclick="loadBoard('today')" class="quick-action-btn" id="btn-today">Today</button>
            </div>
        </div>
    </div>

    <div class="content-grid">
        <div class="card">
            <div class="card-header"><h3>Rankings</h3></div>
            <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
        </div>
        <div class="card">
            <div class="card-header"><h3>Overview</h3></div>
            <div class="card-body" id="analytics-container"><div class="empty-state"><p>Loading...</p></div></div>
        </div>
    </div>
</main>
<script>
function loadBoard(period) {
    period = period || 'all';
    document.querySelectorAll('.quick-actions .quick-action-btn').forEach(function(b) {
        b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
    });
    var active = document.getElementById('btn-' + period);
    if (active) { active.style.background = '#1e3a5f'; active.style.color = '#fff'; active.style.borderColor = '#1e3a5f'; }

    CRM.api('GET','leaderboard?period=' + period).then(function(res) {
        if (!res.success) { CRM.toast(res.message||'Failed','error'); return; }
        CRM.renderTable('table-container', [
            { key:'rank', label:'#', render: function(v){ return '<strong>' + CRM.escapeHtml(String(v)) + '</strong>'; } },
            { key:'name', label:'Employee' },
            { key:'branch_name', label:'Branch' },
            { key:'total_points', label:'Points', render: function(v){ return '<span class="badge badge-purple">' + CRM.escapeHtml(String(v||0)) + '</span>'; } },
            { key:'tasks_completed', label:'Tasks Done' }
        ], res.data, null);
    });

    CRM.api('GET','leaderboard/analytics').then(function(res) {
        if (!res.success) return;
        var d = res.data || {};
        document.getElementById('analytics-container').innerHTML =
            '<ul class="status-list">'
            + '<li class="status-item"><span>Total Employees</span><span class="count">' + (d.total_employees||0) + '</span></li>'
            + '<li class="status-item"><span>Total Points</span><span class="count">' + (d.total_points||0) + '</span></li>'
            + '<li class="status-item"><span>Tasks Completed</span><span class="count">' + (d.tasks_completed||0) + '</span></li>'
            + '</ul>';
    });
}
loadBoard('all');
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
