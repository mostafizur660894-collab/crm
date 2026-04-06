import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, FilterBar, StatusBadge, Pagination, inputClassName, selectClassName, textareaClassName, primaryButtonClassName, inlineActionClassName, dangerInlineActionClassName } from '../components/CrmUI';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', category_id: '', branch_id: '', due_date: '', priority: 'medium', points: '0', status: 'pending' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchTasks = () => {
    setLoading(true);
    API.get('/tasks', { params: { search, status: statusFilter || undefined, page, limit: 25 } })
      .then((res) => { setTasks(res.data.data); setPagination(res.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [search, statusFilter, page]);
  useEffect(() => {
    if (user.role !== 'employee') {
      API.get('/branches').then((res) => setBranches(res.data.data)).catch(() => {});
      API.get('/users', { params: { limit: 200 } }).then((res) => setUsers(res.data.data)).catch(() => {});
      API.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', assigned_to: '', category_id: '', branch_id: '', due_date: '', priority: 'medium', points: '0', status: 'pending' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description || '', assigned_to: t.assigned_to || '',
      category_id: t.category_id || '', branch_id: t.branch_id || '',
      due_date: t.due_date ? t.due_date.split('T')[0] : '', priority: t.priority,
      points: t.points?.toString() || '0', status: t.status,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, points: parseInt(form.points) || 0 };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      if (editing) {
        await API.put(`/tasks/${editing.id}`, payload);
      } else {
        await API.post('/tasks', payload);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try { await API.delete(`/tasks/${id}`); fetchTasks(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const quickStatus = async (id, status) => {
    try { await API.put(`/tasks/${id}`, { status }); fetchTasks(); }
    catch (err) { alert(err.response?.data?.message || 'Update failed'); }
  };

  const statusColors = {
    pending: 'default', in_progress: 'sky',
    completed: 'blue', cancelled: 'default',
  };
  const priorityColors = {
    low: 'default', medium: 'sky',
    high: 'blue', urgent: 'blue',
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'priority', label: 'Priority', render: (r) => (
      <StatusBadge tone={priorityColors[r.priority]}>{r.priority}</StatusBadge>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <StatusBadge tone={statusColors[r.status]}>{r.status.replace('_', ' ')}</StatusBadge>
    )},
    { key: 'points', label: 'Points', render: (r) => <span className="font-bold text-sky-100">{r.points}</span> },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'due_date', label: 'Due', render: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString() : '—' },
    { key: 'branch_name', label: 'Branch' },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-1 flex-wrap">
        {user.role === 'employee' ? (
          <>
            {r.status === 'pending' && <button onClick={() => quickStatus(r.id, 'in_progress')} className={inlineActionClassName}>Start</button>}
            {r.status === 'in_progress' && <button onClick={() => quickStatus(r.id, 'completed')} className={inlineActionClassName}>Complete</button>}
          </>
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
        eyebrow="Task Flow"
        title={user.role === 'employee' ? 'Stay on top of your assigned task queue inside the glass workspace.' : 'Manage tasks in the same premium operating layer as the dashboard.'}
        description="Track priorities, progress, due dates, and assignments with cleaner spacing and blue-only emphasis."
        action={user.role !== 'employee' ? <button onClick={openCreate} className={primaryButtonClassName}><Icon name="plus" className="h-4 w-4" />Add Task</button> : null}
      />

      <FilterBar>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="glass-input h-12 w-64" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="glass-input h-12 w-52 appearance-none">
          <option value="">All Status</option>
          {['pending', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} data={tasks} emptyMsg="No tasks found" />
          <Pagination page={page} pages={pagination.pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Task' : 'Add Task'} wide>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClassName} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={textareaClassName} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <select required={!editing} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
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
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={selectClassName}>
              <option value="">No Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={selectClassName}>
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputClassName} />
            <input type="number" placeholder="Points" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })}
              className={inputClassName} />
            {editing && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={selectClassName}>
                {['pending', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            )}
          </div>
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
