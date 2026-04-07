<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_role('admin');
$user = current_user();
$pageTitle = 'Leads';
$activePage = 'leads';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main-content">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
            <h2>Leads</h2>
            <p>Manage all leads — add, edit, convert, or delete.</p>
        </div>
        <button onclick="addLead()" class="quick-action-btn" style="background:#1e3a5f;color:#fff;border-color:#1e3a5f;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Lead
        </button>
    </div>
    <div class="card">
        <div class="card-header" id="search-bar"></div>
        <div class="card-body no-pad" id="table-container">
            <div class="empty-state"><p>Loading...</p></div>
        </div>
        <div id="pagination"></div>
    </div>
</main>

<script>
var currentPage = 1, currentSearch = '';

function loadLeads(page) {
    page = page || 1; currentPage = page;
    var qs = 'limit=25&page=' + page;
    if (currentSearch) qs += '&search=' + encodeURIComponent(currentSearch);
    CRM.api('GET', 'leads?' + qs).then(function(res) {
        if (!res.success) { CRM.toast(res.message || 'Failed to load', 'error'); return; }
        CRM.renderTable('table-container', [
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'company', label: 'Company' },
            { key: 'source', label: 'Source' },
            { key: 'status', label: 'Status', badge: CRM.statusBadge }
        ], res.data, [
            { label: 'Edit', handler: 'editLead' },
            { label: 'Convert', handler: 'convertLead' },
            { label: 'Delete', handler: 'deleteLead', danger: true }
        ]);
        CRM.renderPagination('pagination', res.pagination, 'loadLeads');
    });
}

function addLead() {
    var html = CRM.field('Name', 'name', '', 'text', {required:true, placeholder:'Full name'})
        + CRM.field('Phone', 'phone', '', 'tel', {required:true, placeholder:'Phone number'})
        + CRM.field('Email', 'email', '', 'email', {placeholder:'Email address'})
        + CRM.field('Company', 'company', '', 'text', {placeholder:'Company name'})
        + CRM.field('Source', 'source', '', 'select', {options:['','Facebook','Google','Referral','Website','Walk-in','Other']})
        + CRM.field('Status', 'status', 'new', 'select', {options:[
            {value:'new',label:'New'},{value:'contacted',label:'Contacted'},{value:'qualified',label:'Qualified'},
            {value:'proposal',label:'Proposal'},{value:'negotiation',label:'Negotiation'},{value:'converted',label:'Converted'},{value:'lost',label:'Lost'}
        ]})
        + CRM.field('Notes', 'notes', '', 'textarea', {placeholder:'Any notes...'});
    CRM.openModal('Add New Lead', html, function(data) {
        CRM.api('POST', 'leads', data).then(function(res) {
            CRM.closeModal();
            if (res.success) { CRM.toast('Lead created'); loadLeads(currentPage); }
            else CRM.toast(res.message || 'Error', 'error');
        });
    });
}

function editLead(id) {
    CRM.api('GET', 'leads?limit=500').then(function(res) {
        var lead = (res.data || []).find(function(l) { return l.id == id; });
        if (!lead) { CRM.toast('Lead not found', 'error'); return; }
        var html = CRM.field('Name', 'name', lead.name, 'text', {required:true})
            + CRM.field('Phone', 'phone', lead.phone, 'tel', {required:true})
            + CRM.field('Email', 'email', lead.email || '', 'email')
            + CRM.field('Company', 'company', lead.company || '', 'text')
            + CRM.field('Source', 'source', lead.source || '', 'select', {options:['','Facebook','Google','Referral','Website','Walk-in','Other']})
            + CRM.field('Status', 'status', lead.status, 'select', {options:[
                {value:'new',label:'New'},{value:'contacted',label:'Contacted'},{value:'qualified',label:'Qualified'},
                {value:'proposal',label:'Proposal'},{value:'negotiation',label:'Negotiation'},{value:'converted',label:'Converted'},{value:'lost',label:'Lost'}
            ]})
            + CRM.field('Notes', 'notes', lead.notes || '', 'textarea');
        CRM.openModal('Edit Lead', html, function(data) {
            data.id = id;
            CRM.api('PUT', 'leads', data).then(function(res) {
                CRM.closeModal();
                if (res.success) { CRM.toast('Lead updated'); loadLeads(currentPage); }
                else CRM.toast(res.message || 'Error', 'error');
            });
        });
    });
}

function convertLead(id) {
    CRM.confirm('Convert this lead to a client?', function() {
        CRM.api('POST', 'leads/' + id + '/convert').then(function(res) {
            if (res.success) { CRM.toast('Lead converted to client'); loadLeads(currentPage); }
            else CRM.toast(res.message || 'Error', 'error');
        });
    });
}

function deleteLead(id) {
    CRM.confirm('Delete this lead permanently?', function() {
        CRM.api('DELETE', 'leads', {id: id}).then(function(res) {
            if (res.success) { CRM.toast('Lead deleted'); loadLeads(currentPage); }
            else CRM.toast(res.message || 'Error', 'error');
        });
    });
}

CRM.renderSearchBar('search-bar', 'Search leads by name, phone, email...', function(q) {
    currentSearch = q; loadLeads(1);
});
loadLeads(1);
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
