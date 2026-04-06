import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, StatusBadge, Pagination, inputClassName, selectClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function FollowUps() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [followUps, setFollowUps] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ lead_id: '', client_id: '', assigned_to: '', branch_id: '', followup_date: '', note: '', status: 'pending', type: 'lead' });
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);

  const fetchFollowUps = () => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (statusFilter) params.status = statusFilter;
    const endpoint = tab === 'today' ? '/followups/today' : '/followups';
    API.get(endpoint, { params })
      .then((res) => { setFollowUps(res.data.data); setPagination(res.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFollowUps(); }, [statusFilter, tab, page]);
  useEffect(() => {
    if (isEmployee) return;
    Promise.all([
      API.get('/users', { params: { limit: 200 } }),
      API.get('/leads', { params: { limit: 200 } }),
      API.get('/clients', { params: { limit: 200 } }),
      API.get('/branches'),
    ]).then(([uRes, lRes, cRes, bRes]) => {
      setUsers(uRes.data.data || []);
      setLeads(lRes.data.data || []);
      setClients(cRes.data.data || []);
      setBranches(bRes.data.data || []);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ lead_id: '', client_id: '', assigned_to: '', branch_id: '', followup_date: '', note: '', status: 'pending', type: 'lead' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      lead_id: f.lead_id || '', client_id: f.client_id || '', assigned_to: f.assigned_to || '',
      branch_id: f.branch_id || '', followup_date: f.followup_date ? f.followup_date.split('T')[0] : '',
      note: f.note || '', status: f.status, type: f.lead_id ? 'lead' : 'client',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (payload.type === 'lead') { delete payload.client_id; } else { delete payload.lead_id; }
      delete payload.type;
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      if (editing) {
        await API.put(`/followups/${editing.id}`, payload);
      } else {
        await API.post('/followups', payload);
      }
      setShowModal(false);
      fetchFollowUps();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this follow-up?')) return;
    try { await API.delete(`/followups/${id}`); fetchFollowUps(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const quickDone = async (id) => {
    try { await API.put(`/followups/${id}`, { status: 'done' }); fetchFollowUps(); }
    catch (err) { alert(err.response?.data?.message || 'Update failed'); }
  };

  const statusColors = {
    pending: 'default', done: 'sky',
    missed: 'blue',
  };

  const columns = [
    { key: 'id', label: '#' },
    { key: 'type', label: 'Type', render: (r) => (
      <StatusBadge tone={r.lead_id ? 'blue' : 'sky'}>{r.lead_id ? 'Lead' : 'Client'}</StatusBadge>
    )},
    { key: 'related', label: 'Related To', render: (r) => r.lead_name || r.client_name || '—' },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'followup_date', label: 'Date', render: (r) => r.followup_date ? new Date(r.followup_date).toLocaleDateString() : '—' },
    { key: 'note', label: 'Note', render: (r) => (
      <span className="max-w-xs truncate block text-sm" title={r.note}>{r.note || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <StatusBadge tone={statusColors[r.status] || 'default'}>{r.status}</StatusBadge>
    )},
    { key: 'branch_name', label: 'Branch' },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        {isEmployee ? (
          r.status === 'pending' && <button onClick={() => quickDone(r.id)} className={inlineActionClassName}>Mark Done</button>
        ) : (
          <>
            <button onClick={() => openEdit(r)} className={inlineActionClassName}>Edit</button>
            <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Follow-up Flow"
        title={isEmployee ? 'Work through today’s follow-up queue in the same premium glass workspace.' : 'Manage follow-ups with cleaner hierarchy and premium blue-glass spacing.'}
        description="Switch between all scheduled follow-ups and today’s queue without falling back to the previous light-style tabs."
        action={!isEmployee ? <button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Follow-up</button> : null}
      />

      <FilterBar>
        <div className="flex rounded-[22px] border border-white/10 bg-white/[0.04] p-1">
          {['all', 'today'].map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`glass-tab ${tab === t ? 'glass-tab-active' : ''}`}>
              {t === 'all' ? 'All' : "Today's"}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="glass-input h-12 w-48 appearance-none">
          <option value="">All Status</option>
          {['pending', 'done', 'missed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} data={followUps} emptyMsg="No follow-ups found" />
          {tab !== 'today' ? <Pagination page={page} pages={pagination.pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /> : null}
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Follow-up' : 'Add Follow-up'} wide>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-sm text-white/68">
            <label className="flex items-center gap-2">
              <input type="radio" checked={form.type === 'lead'} onChange={() => setForm({ ...form, type: 'lead', client_id: '' })} /> Lead
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={form.type === 'client'} onChange={() => setForm({ ...form, type: 'client', lead_id: '' })} /> Client
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.type === 'lead' ? (
              <select required value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                className={selectClassName}>
                <option value="">Select Lead</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className={selectClassName}>
                <option value="">Select Client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className={selectClassName}>
              <option value="">Select Branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select required value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className={selectClassName}>
              <option value="">Assign To</option>
              {users.filter((u) => !form.branch_id || u.branch_id === parseInt(form.branch_id)).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <input type="date" required value={form.followup_date} onChange={(e) => setForm({ ...form, followup_date: e.target.value })}
              className={inputClassName} />
            {editing && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={selectClassName}>
                {['pending', 'done', 'missed'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
            className={textareaClassName} rows={4} />
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
