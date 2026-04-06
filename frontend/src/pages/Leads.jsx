import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, StatusBadge, Pagination, inputClassName, selectClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Leads() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: '', status: 'new', category_id: '', branch_id: '', assigned_to: '', notes: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLeads = () => {
    setLoading(true);
    API.get('/leads', { params: { search, status: statusFilter || undefined, page, limit: 25 } })
      .then((res) => { setLeads(res.data.data); setPagination(res.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, [search, statusFilter, page]);
  useEffect(() => {
    API.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
    API.get('/branches').then((res) => setBranches(res.data.data)).catch(() => {});
    API.get('/users', { params: { limit: 200 } }).then((res) => setUsers(res.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', source: '', status: 'new', category_id: '', branch_id: '', assigned_to: '', notes: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      name: l.name, email: l.email || '', phone: l.phone, company: l.company || '',
      source: l.source || '', status: l.status, category_id: l.category_id || '',
      branch_id: l.branch_id || '', assigned_to: l.assigned_to || '', notes: l.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      if (editing) {
        await API.put(`/leads/${editing.id}`, payload);
      } else {
        await API.post('/leads', payload);
      }
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    try { await API.delete(`/leads/${id}`); fetchLeads(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleConvert = async (id) => {
    if (!confirm('Convert this lead to a client?')) return;
    try { await API.post(`/leads/${id}/convert`); fetchLeads(); }
    catch (err) { alert(err.response?.data?.message || 'Conversion failed'); }
  };

  const statusColors = {
    new: 'blue', contacted: 'sky', qualified: 'emerald', converted: 'blue', lost: 'default',
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => (
      <StatusBadge tone={statusColors[r.status] || 'default'}>{r.status}</StatusBadge>
    )},
    { key: 'category_name', label: 'Category' },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'branch_name', label: 'Branch' },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        {isEmployee ? (
          <button onClick={() => openEdit(r)} className={inlineActionClassName}>Update</button>
        ) : (
          <>
            <button onClick={() => openEdit(r)} className={inlineActionClassName}>Edit</button>
            {r.status !== 'converted' && (
              <button onClick={() => handleConvert(r.id)} className={inlineActionClassName}>Convert</button>
            )}
            <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lead Pipeline"
        title={isEmployee ? 'Track your lead queue inside the premium blue-glass workspace.' : 'Manage the lead pipeline inside one consistent premium glass workspace.'}
        description="Search, qualify, convert, and assign leads without falling back to the older light theme styles."
        action={!isEmployee ? <button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Lead</button> : null}
      />

      <FilterBar>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="glass-input h-12 w-64" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="glass-input h-12 w-48 appearance-none">
          <option value="">All Status</option>
          {['new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} data={leads} emptyMsg="No leads found" />
          <Pagination page={page} pages={pagination.pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Lead' : 'Add Lead'} wide>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClassName} />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClassName} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClassName} />
            <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputClassName} />
            <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className={inputClassName} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectClassName}>
              {['new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={selectClassName}>
              <option value="">No Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select required={!editing} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className={selectClassName}>
              <option value="">Select Branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className={`${selectClassName} col-span-2`}>
              <option value="">Unassigned</option>
              {users.filter((u) => !form.branch_id || u.branch_id === parseInt(form.branch_id)).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={textareaClassName} rows={3} />
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
