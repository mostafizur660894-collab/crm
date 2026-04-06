import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, StatusBadge, Pagination, inputClassName, selectClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Clients() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const isSuperSub = user?.role === 'sub_admin' && user?.is_super;
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', category_id: '', branch_id: '', assigned_to: '', status: 'active' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchClients = () => {
    setLoading(true);
    API.get('/clients', { params: { search, page, limit: 25 } })
      .then((res) => { setClients(res.data.data); setPagination(res.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [search, page]);
  useEffect(() => {
    API.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
    API.get('/branches').then((res) => setBranches(res.data.data)).catch(() => {});
    API.get('/users', { params: { limit: 200 } }).then((res) => setUsers(res.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', address: '', category_id: '', branch_id: '', assigned_to: '', status: 'active' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, email: c.email || '', phone: c.phone, company: c.company || '',
      address: c.address || '', category_id: c.category_id || '', branch_id: c.branch_id || '',
      assigned_to: c.assigned_to || '', status: c.status,
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
        await API.put(`/clients/${editing.id}`, payload);
      } else {
        await API.post('/clients', payload);
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try { await API.delete(`/clients/${id}`); fetchClients(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'status', label: 'Status', render: (r) => (
      <StatusBadge tone={r.status === 'active' ? 'sky' : 'default'}>{r.status}</StatusBadge>
    )},
    { key: 'category_name', label: 'Category' },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'branch_name', label: 'Branch' },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className={inlineActionClassName}>{isEmployee ? 'Update' : 'Edit'}</button>
        {!isEmployee && !isSuperSub && <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client Relationships"
        title={isEmployee ? 'Track your assigned clients with the same premium CRM design system.' : 'Manage clients inside one premium glass workspace.'}
        description="Keep client assignments, category links, and branch ownership aligned without mixing in the older light UI styles."
        action={!isEmployee ? <button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Client</button> : null}
      />

      <FilterBar>
        <input type="text" placeholder="Search clients" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="glass-input h-12 w-64" />
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} data={clients} emptyMsg="No clients found" />
          <Pagination page={page} pages={pagination.pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Client' : 'Add Client'} wide>
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
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectClassName}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              className={selectClassName}>
              <option value="">Unassigned</option>
              {users.filter((u) => !form.branch_id || u.branch_id === parseInt(form.branch_id)).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={textareaClassName} rows={3} />
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
