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
        <div style="display:flex;gap:.75rem;">
            <button onclick="showClientList()" class="btn-secondary" id="btn-back-list" style="display:none;">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to List
            </button>
            <button onclick="addClient()" class="btn-primary">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                Add Client
            </button>
        </div>
    </div>

    <!-- Client List View -->
    <div id="client-list-view">
        <div class="card">
            <div class="card-header" id="search-bar"></div>
            <div class="card-body no-pad" id="table-container"><div class="empty-state"><p>Loading...</p></div></div>
            <div id="pagination"></div>
        </div>
    </div>

    <!-- Client Detail View (hidden by default) -->
    <div id="client-detail-view" style="display:none;">
        <div class="content-grid wide-left">
            <div>
                <div class="card">
                    <div class="card-header">
                        <h3 id="detail-client-name">Client Details</h3>
                        <div>
                            <button class="btn-secondary btn-sm" onclick="editClientFromDetail()">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit
                            </button>
                        </div>
                    </div>
                    <div class="card-body" id="detail-panel"></div>
                </div>

                <!-- Notes Section -->
                <div class="card">
                    <div class="card-header">
                        <h3>Notes</h3>
                        <span class="badge badge-gray" id="notes-count">0</span>
                    </div>
                    <div class="card-body">
                        <div class="add-note-form">
                            <textarea id="new-note-text" placeholder="Add a note about this client..." rows="2"></textarea>
                            <button class="btn-primary btn-sm" onclick="addNote()">Add Note</button>
                        </div>
                        <div class="notes-section" id="notes-list">
                            <div class="notif-empty">No notes yet</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Quick Info -->
            <div>
                <div class="card">
                    <div class="card-header"><h3>Quick Info</h3></div>
                    <div class="card-body" id="quick-info"></div>
                </div>
            </div>
        </div>
    </div>
</main>
<script>
var currentPage = 1, currentSearch = '', loadedClients = [], viewingClientId = null;

function loadClients(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET', 'clients?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message || 'Failed', 'error'); return; }
        loadedClients = res.data || [];
        CRM.renderTable('table-container', [
            { key: 'name', label: 'Name', render: function(v) { return '<strong>' + CRM.escapeHtml(v) + '</strong>'; } },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'company', label: 'Company' },
            { key: 'status', label: 'Status', badge: CRM.statusBadge }
        ], res.data, function(row) {
            return CRM.actionBtn('View', 'view', 'viewClient(' + row.id + ')')
                + CRM.actionBtn('Edit', 'edit', 'editClient(' + row.id + ')')
                + CRM.actionBtn('Delete', 'delete', 'deleteClient(' + row.id + ')');
        });
        CRM.renderPagination('pagination', res.pagination, 'loadClients');
    });
}

function showClientList() {
    document.getElementById('client-list-view').style.display = '';
    document.getElementById('client-detail-view').style.display = 'none';
    document.getElementById('btn-back-list').style.display = 'none';
    viewingClientId = null;
}

function viewClient(id) {
    var c = loadedClients.find(function(x) { return x.id == id; });
    if (!c) {
        // Fetch from API if not in loadedClients
        CRM.api('GET', 'clients?limit=500').then(function(res) {
            c = (res.data || []).find(function(x) { return x.id == id; });
            if (c) renderClientDetail(c);
            else CRM.toast('Client not found', 'error');
        });
        return;
    }
    renderClientDetail(c);
}

function renderClientDetail(c) {
    viewingClientId = c.id;
    document.getElementById('client-list-view').style.display = 'none';
    document.getElementById('client-detail-view').style.display = '';
    document.getElementById('btn-back-list').style.display = '';
    document.getElementById('detail-client-name').textContent = c.name || 'Client Details';

    CRM.renderDetailPanel('detail-panel', [
        { label: 'Full Name', value: c.name },
        { label: 'Phone', value: c.phone },
        { label: 'Email', value: c.email },
        { label: 'Company', value: c.company },
        { label: 'Status', html: '<span class="badge ' + CRM.statusBadge(c.status || '') + '">' + CRM.escapeHtml(c.status || '—') + '</span>' },
        { label: 'Created', value: c.created_at ? c.created_at.substring(0, 10) : '—' },
        { label: 'Address', value: c.address, fullWidth: true }
    ]);

    // Quick Info sidebar
    var qi = document.getElementById('quick-info');
    if (qi) {
        qi.innerHTML = '<ul class="status-list">'
            + '<li class="status-item"><span><span class="status-dot" style="background:var(--info)"></span>Status</span><span class="badge ' + CRM.statusBadge(c.status || '') + '">' + CRM.escapeHtml(c.status || '—') + '</span></li>'
            + '<li class="status-item"><span><span class="status-dot" style="background:var(--success)"></span>Phone</span><span class="count">' + CRM.escapeHtml(c.phone || '—') + '</span></li>'
            + '<li class="status-item"><span><span class="status-dot" style="background:var(--warning)"></span>Company</span><span class="count">' + CRM.escapeHtml(c.company || '—') + '</span></li>'
            + '</ul>';
    }

    // Load notes for this client
    loadNotes(c.id);
}

function loadNotes(clientId) {
    CRM.api('GET', 'notes?client_id=' + clientId).then(function(res) {
        var notes = res.data || res.notes || [];
        var countEl = document.getElementById('notes-count');
        if (countEl) countEl.textContent = notes.length;

        var list = document.getElementById('notes-list');
        if (!list) return;

        if (notes.length === 0) {
            list.innerHTML = '<div class="notif-empty" style="padding:1rem;text-align:center;color:var(--text-muted);font-size:.85rem;">No notes yet — add one above.</div>';
            return;
        }

        var html = '';
        notes.forEach(function(n) {
            html += '<div class="note-card">'
                + '<div class="note-header">'
                + '<span class="note-author">' + CRM.escapeHtml(n.user_name || n.author || 'You') + '</span>'
                + '<span class="note-date">' + CRM.escapeHtml(n.created_at || '') + '</span>'
                + '</div>'
                + '<div class="note-body">' + CRM.escapeHtml(n.content || n.note || n.text || '') + '</div>'
                + '</div>';
        });
        list.innerHTML = html;
    }).catch(function() {
        var list = document.getElementById('notes-list');
        if (list) list.innerHTML = '<div class="notif-empty" style="padding:1rem;text-align:center;color:var(--text-muted);font-size:.85rem;">Notes unavailable</div>';
    });
}

function addNote() {
    if (!viewingClientId) return;
    var textarea = document.getElementById('new-note-text');
    var text = textarea ? textarea.value.trim() : '';
    if (!text) { CRM.toast('Please enter a note', 'warning'); return; }

    CRM.api('POST', 'notes', { client_id: viewingClientId, content: text }).then(function(res) {
        if (res.success) {
            CRM.toast('Note added');
            if (textarea) textarea.value = '';
            loadNotes(viewingClientId);
        } else {
            CRM.toast(res.message || 'Error', 'error');
        }
    });
}

function editClientFromDetail() {
    if (viewingClientId) editClient(viewingClientId);
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
    var c = loadedClients.find(function(x) { return x.id == id; });
    if (!c) {
        CRM.api('GET','clients?limit=500').then(function(res) {
            c = (res.data||[]).find(function(x){return x.id==id;});
            if (c) openEditModal(c);
            else CRM.toast('Not found','error');
        });
        return;
    }
    openEditModal(c);
}

function openEditModal(c) {
    var html = CRM.field('Name','name',c.name,'text',{required:true})
        + CRM.field('Phone','phone',c.phone,'tel',{required:true})
        + CRM.field('Email','email',c.email||'','email')
        + CRM.field('Company','company',c.company||'','text')
        + CRM.field('Address','address',c.address||'','textarea')
        + CRM.field('Status','status',c.status,'select',{options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'prospect',label:'Prospect'}]});
    CRM.openModal('Edit Client', html, function(data) {
        data.id = c.id;
        CRM.api('PUT','clients',data).then(function(res) {
            CRM.closeModal();
            if (res.success) {
                CRM.toast('Client updated');
                loadClients(currentPage);
                if (viewingClientId == c.id) viewClient(c.id);
            } else CRM.toast(res.message||'Error','error');
        });
    });
}

function deleteClient(id) {
    CRM.confirm('Delete this client?', function() {
        CRM.api('DELETE','clients',{id:id}).then(function(res) {
            if (res.success) {
                CRM.toast('Client deleted');
                if (viewingClientId == id) showClientList();
                loadClients(currentPage);
            } else CRM.toast(res.message||'Error','error');
        });
    });
}

CRM.renderSearchBar('search-bar','Search clients...',function(q){ currentSearch=q; loadClients(1); });
loadClients(1);
if (CRM.loadNotifications) CRM.loadNotifications();
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
