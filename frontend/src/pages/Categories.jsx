import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api/axios';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/UiIcons';
import { PageHeader, StatusBadge, inputClassName, textareaClassName, primaryButtonClassName, secondaryButtonClassName } from '../components/CrmUI';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    API.get('/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await API.put(`/categories/${editing.id}`, form);
      } else {
        await API.post('/categories', form);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await API.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const categoryCards = categories.map((category) => {
    const totalTasks = Number(category.task_total || 0);
    const completedTasks = Number(category.completed_tasks || 0);
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...category,
      totalTasks,
      completedTasks,
      progress,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Category Grid"
        title="Organize category performance in the same glass control system as the dashboard."
        description="Each category card surfaces task load, completion progress, ownership signal, and the next visible deadline inside one premium blue-only layout."
        action={
          <button onClick={openCreate} className={primaryButtonClassName}>
            <Icon name="plus" className="h-4 w-4" />
            Add Category
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoryCards.map((category, index) => (
            <motion.article
              key={category.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.22) }}
              className="glass-panel glass-card-hover p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="glass-badge mb-3 w-fit">Category</div>
                  <h2 className="text-xl font-bold text-white/94">{category.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/46">{category.description || 'No description added yet.'}</p>
                </div>
                <StatusBadge tone={category.is_active ? 'sky' : 'default'}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="glass-callout">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/34">Assigned User</p>
                  <p className="mt-2 text-sm font-semibold text-white/86">{category.assigned_user_name || 'Unassigned'}</p>
                </div>
                <div className="glass-callout">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/34">Deadline</p>
                  <p className="mt-2 text-sm font-semibold text-white/86">{category.next_deadline ? new Date(category.next_deadline).toLocaleDateString() : 'No deadline'}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-white/54">Progress</span>
                  <span className="font-semibold text-white/88">{category.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-300/90 to-blue-300/55" style={{ width: `${Math.max(category.progress, category.totalTasks > 0 ? 14 : 0)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-white/44">
                  <span>{category.completedTasks} completed</span>
                  <span>{category.totalTasks} tasks</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setViewing(category)} className={secondaryButtonClassName}>
                  View
                </button>
                <button onClick={() => openEdit(category)} className={primaryButtonClassName}>
                  Edit
                </button>
              </div>
            </motion.article>
          ))}
          {categoryCards.length === 0 ? (
            <div className="glass-panel p-12 text-center text-white/48 md:col-span-2 xl:col-span-3">No categories found</div>
          ) : null}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        {error && <div className="mb-3 rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClassName} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={textareaClassName} rows={4} />
          <button type="submit" className={`w-full ${primaryButtonClassName}`}>
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Category Overview'}>
        {viewing ? (
          <div className="space-y-4 text-sm text-white/68">
            <div className="glass-callout">
              <p className="text-xs uppercase tracking-[0.18em] text-white/34">Assigned User</p>
              <p className="mt-2 font-semibold text-white/88">{viewing.assigned_user_name || 'Unassigned'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass-callout">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Progress</p>
                <p className="mt-2 font-semibold text-white/88">{viewing.progress}%</p>
              </div>
              <div className="glass-callout">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Next Deadline</p>
                <p className="mt-2 font-semibold text-white/88">{viewing.next_deadline ? new Date(viewing.next_deadline).toLocaleDateString() : 'No deadline'}</p>
              </div>
            </div>
            <div className="glass-callout">
              <p className="text-xs uppercase tracking-[0.18em] text-white/34">Description</p>
              <p className="mt-2 leading-6 text-white/56">{viewing.description || 'No description added yet.'}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
