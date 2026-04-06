import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, StatusBadge, Pagination, inputClassName, selectClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Users() {
  const { user: currentUser } = useAuth();
  const isSuperSub = currentUser?.role === 'sub_admin' && currentUser?.is_super;
  const isAdmin = currentUser?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role_id: '', branch_id: '', is_super: false });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchUsers = () => {
    setLoading(true);
    API.get('/users', { params: { search, page, limit: 25 } })
      .then((res) => { setUsers(res.data.data); setPagination(res.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search, page]);
  useEffect(() => {
    API.get('/users/roles').then((res) => setRoles(res.data.data)).catch(() => {});
    API.get('/branches').then((res) => setBranches(res.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', password: '', role_id: '', branch_id: '', is_super: false });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role_id: u.role_id, branch_id: u.branch_id || '', is_super: !!u.is_super });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.branch_id) delete payload.branch_id;
      // Only admin sends is_super, and only for sub_admin role
      const selectedRole = roles.find((r) => String(r.id) === String(payload.role_id));
      if (isAdmin && selectedRole?.name === 'sub_admin') {
        payload.is_super = payload.is_super ? 1 : 0;
      } else {
        delete payload.is_super;
      }
      if (editing) {
        await API.put(`/users/${editing.id}`, payload);
      } else {
        await API.post('/users', payload);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role_name', label: 'Role', render: (r) => (
      <StatusBadge tone={r.is_super ? 'blue' : 'sky'}>
        {r.role_name?.replace('_', ' ')}{r.is_super ? ' ★' : ''}
      </StatusBadge>
    )},
    { key: 'branch_name', label: 'Branch' },
    { key: 'is_active', label: 'Status', render: (r) => (
      <StatusBadge tone={r.is_active ? 'sky' : 'default'}>
        {r.is_active ? 'Active' : 'Inactive'}
      </StatusBadge>
    )},
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className={inlineActionClassName}>Edit</button>
        {!isSuperSub && <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employee Directory"
        title="Manage employees inside the same premium glass shell used across the CRM."
        description="Review roles, branches, and access without switching visual language between admin actions and daily operations."
        action={<button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Employee</button>}
      />

      <FilterBar>
        <input
          type="text" placeholder="Search employees" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="glass-input h-12 w-full max-w-sm"
        />
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} data={users} emptyMsg="No users found" />
          <Pagination page={page} pages={pagination.pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Add User'}>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClassName} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClassName} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClassName} />
          <input type="password" placeholder={editing ? 'New password (leave blank to keep)' : 'Password'}
            required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClassName} />
          <select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            className={selectClassName}>
            <option value="">Select Role</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>)}
          </select>
          <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            className={selectClassName}>
            <option value="">No Branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {isAdmin && roles.find((r) => String(r.id) === String(form.role_id))?.name === 'sub_admin' && (
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/68">
              <input type="checkbox" checked={form.is_super} onChange={(e) => setForm({ ...form, is_super: e.target.checked })}
                className="h-4 w-4 rounded border-white/12 bg-transparent" />
              Full Access Sub-Admin (Super)
            </label>
          )}
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
