import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, EmptySelectionState, Pagination, inputClassName, selectClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ notable_type: 'lead', notable_id: '', content: '' });
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('lead');
  const [selectedId, setSelectedId] = useState('');
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);

  const fetchNotes = () => {
    if (!selectedType || !selectedId) { setNotes([]); return; }
    setLoading(true);
    API.get('/notes', { params: { notable_type: selectedType, notable_id: selectedId } })
      .then((res) => setNotes(res.data.data || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotes(); }, [selectedType, selectedId]);
  useEffect(() => {
    Promise.all([
      API.get('/leads', { params: { limit: 200 } }),
      API.get('/clients', { params: { limit: 200 } }),
      API.get('/tasks', { params: { limit: 200 } }),
    ]).then(([lRes, cRes, tRes]) => {
      setLeads(lRes.data.data || []);
      setClients(cRes.data.data || []);
      setTasks(tRes.data.data || []);
    }).catch(() => {});
  }, []);

  const getOptions = (type) => {
    if (type === 'lead') return leads.map((l) => ({ id: l.id, name: l.name }));
    if (type === 'client') return clients.map((c) => ({ id: c.id, name: c.name }));
    if (type === 'task') return tasks.map((t) => ({ id: t.id, name: t.title }));
    return [];
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ notable_type: selectedType, notable_id: selectedId, content: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({ notable_type: n.notable_type, notable_id: n.notable_id, content: n.content || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await API.put(`/notes/${editing.id}`, { content: form.content });
      } else {
        await API.post('/notes', form);
      }
      setShowModal(false);
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    try { await API.delete(`/notes/${id}`); fetchNotes(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const isEmployee = user?.role === 'employee';

  const columns = [
    { key: 'content', label: 'Content', render: (r) => (
      <span className="max-w-lg block text-sm whitespace-pre-wrap">{r.content}</span>
    )},
    { key: 'created_by_name', label: 'By' },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className={inlineActionClassName}>Edit</button>
        {!isEmployee && <button onClick={() => handleDelete(r.id)} className={dangerInlineActionClassName}>Delete</button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shared Notes"
        title="Keep lead, client, and task notes inside the same premium glass workspace."
        description="Context stays attached to the record you select, without breaking the visual system between writing, reviewing, and editing notes."
        action={selectedId ? <button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Note</button> : null}
      />

      <FilterBar>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-white/40">Type</label>
          <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSelectedId(''); }}
            className={`${selectClassName} w-40`}>
            {['lead', 'client', 'task'].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-white/40">Select {selectedType}</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            className={`${selectClassName} min-w-[220px]`}>
            <option value="">— Choose —</option>
            {getOptions(selectedType).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </FilterBar>

      {!selectedId ? (
        <EmptySelectionState icon="notes" title={`Select a ${selectedType} to view notes`} description="Choose a related record above to reveal its note history inside the glass workspace." />
      ) : loading ? <LoadingSpinner /> : (
        <DataTable columns={columns} data={notes} emptyMsg={`No notes for this ${selectedType}`} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Note' : 'Add Note'}>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <select required value={form.notable_type} onChange={(e) => setForm({ ...form, notable_type: e.target.value, notable_id: '' })}
                className={selectClassName}>
                {['lead', 'client', 'task'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select required value={form.notable_id} onChange={(e) => setForm({ ...form, notable_id: e.target.value })}
                className={selectClassName}>
                <option value="">Select {form.notable_type}</option>
                {getOptions(form.notable_type).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
          <textarea required placeholder="Write your note here..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={textareaClassName} rows={6} />
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
