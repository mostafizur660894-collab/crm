import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import Icon from '../../components/UiIcons';

export default function ClientDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard/client')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="py-10 text-center text-white/44">Failed to load dashboard</p>;

  const { client, follow_ups, notifications } = data;

  const fupCols = [
    { key: 'followup_date', label: 'Date', render: (r) => new Date(r.followup_date).toLocaleDateString() },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize
        ${r.status === 'done' ? 'border-emerald-200/20 bg-emerald-400/10 text-emerald-100' : r.status === 'missed' ? 'border-rose-200/20 bg-rose-400/10 text-rose-100' : 'border-amber-200/20 bg-amber-300/10 text-amber-100'}`}>
        {r.status}
      </span>
    )},
    { key: 'note', label: 'Note', render: (r) => r.note || '—' },
  ];

  const notifCols = [
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel-strong p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="glass-badge mb-4 w-fit">Client Portal</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white/96">Review your relationship timeline, scheduled follow-ups, and service updates in one place.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/56">A lighter client-facing dashboard with the same glass treatment, built to feel polished without exposing internal complexity.</p>
          </div>
          <div className="glass-panel p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-400/10 text-sky-100">
                <Icon name="message" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/56">Open notifications</p>
                <p className="mt-2 text-3xl font-extrabold text-white/96">{notifications.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {client ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-bold text-white/92">My Profile</h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><span className="text-white/42">Name:</span> <span className="ml-2 font-medium text-white/78">{client.name}</span></div>
            <div><span className="text-white/42">Email:</span> <span className="ml-2 font-medium text-white/78">{client.email || '—'}</span></div>
            <div><span className="text-white/42">Phone:</span> <span className="ml-2 font-medium text-white/78">{client.phone}</span></div>
            <div><span className="text-white/42">Company:</span> <span className="ml-2 font-medium text-white/78">{client.company || '—'}</span></div>
            <div><span className="text-white/42">Status:</span>
              <span className={`ml-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${client.status === 'active' ? 'border-emerald-200/20 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
                {client.status}
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="glass-panel p-6 text-center text-white/42">
          No client profile linked to your account
        </div>
      )}

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white/92">Follow-ups</h2>
          <p className="mt-1 text-sm text-white/44">Upcoming or completed relationship checkpoints from your account team.</p>
        </div>
        <DataTable columns={fupCols} data={follow_ups} emptyMsg="No follow-ups" />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white/92">Notifications</h2>
          <p className="mt-1 text-sm text-white/44">Recent product, service, and account updates relevant to your pipeline.</p>
        </div>
        <DataTable columns={notifCols} data={notifications} emptyMsg="No notifications" />
      </div>
    </div>
  );
}
