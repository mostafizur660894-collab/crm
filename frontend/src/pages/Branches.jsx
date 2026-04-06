import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, StatusBadge, inputClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Branches() {
  const { user } = useAuth();
  const isSuperSub = user?.role === 'sub_admin' && user?.is_super;
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '' });
  const [error, setError] = useState('');

  const fetchBranches = () => {
    setLoading(true);
    API.get('/branches')
      .then((res) => setBranches(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBranches(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', city: '', state: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, address: b.address || '', city: b.city || '', state: b.state || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await API.put(`/branches/${editing.id}`, form);
      } else {
        await API.post('/branches', form);
      }
      setShowModal(false);
      fetchBranches();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this branch?')) return;
    try {
      await API.delete(`/branches/${id}`);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'address', label: 'Address' },
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
        eyebrow="Branch Directory"
        title="Manage branch coverage inside the same glass workspace as the rest of the CRM."
        description="Branches keep assignments, follow-ups, and user routing anchored without leaving the blue-glass design system."
        action={<button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Branch</button>}
      />

      {loading ? <LoadingSpinner /> : <DataTable columns={columns} data={branches} emptyMsg="No branches found" />}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Branch' : 'Add Branch'}>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClassName} />
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={textareaClassName} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={inputClassName} />
            <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={inputClassName} />
          </div>
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
