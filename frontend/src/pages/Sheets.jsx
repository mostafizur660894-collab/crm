import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, StatusBadge, inputClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Sheets() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ sheet_url: '', sheet_name: '' });
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSheets = () => {
    setLoading(true);
    API.get('/sheets')
      .then((res) => setSheets(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSheets(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      const payload = { sheet_url: form.sheet_url };
      if (form.sheet_name) payload.sheet_name = form.sheet_name;
      await API.post('/sheets', payload);
      setShowAddModal(false);
      setForm({ sheet_url: '', sheet_name: '' });
      fetchSheets();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add sheet');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sheet?')) return;
    try { await API.delete(`/sheets/${id}`); fetchSheets(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const basePath = window.location.pathname.startsWith('/sub-admin') ? '/sub-admin' : '/admin';

  const columns = [
    { key: 'sheet_name', label: 'Sheet Name', render: (r) => (
      <span className="font-medium text-white/92">{r.sheet_name || 'Untitled'}</span>
    )},
    { key: 'added_by_name', label: 'Added By' },
    { key: 'created_at', label: 'Added On', render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => navigate(`${basePath}/sheets/${r.id}`)} className={inlineActionClassName}>View</button>
        <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Sheets"
        title="Connect live sheets without breaking the premium dashboard design language."
        description="Sheet links, sync targets, and live previews now sit on the same dark-blue glass surface as the rest of the CRM."
        action={<button onClick={() => { setError(''); setForm({ sheet_url: '', sheet_name: '' }); setShowAddModal(true); }} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Sheet</button>}
      />

      {loading ? <LoadingSpinner /> : (
        <DataTable columns={columns} data={sheets} emptyMsg="No sheets added yet. Click '+ Add Sheet' to get started." />
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Google Sheet">
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/68">Sheet Name</label>
            <input placeholder="e.g. January Leads" value={form.sheet_name} onChange={(e) => setForm({ ...form, sheet_name: e.target.value })}
              className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/68">Google Sheet URL <span className="text-sky-200">*</span></label>
            <input required placeholder="https://docs.google.com/spreadsheets/d/..." value={form.sheet_url} onChange={(e) => setForm({ ...form, sheet_url: e.target.value })}
              className={inputClassName} />
            <p className="mt-1 text-xs text-white/40">Make sure the sheet is shared with the service account email.</p>
          </div>
          <button type="submit" disabled={adding}
            className={`w-full ${primaryButtonClassName} disabled:opacity-50`}>
            {adding ? 'Adding...' : 'Add Sheet'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
