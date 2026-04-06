import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import Icon from '../../components/UiIcons';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard/employee')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="py-10 text-center text-white/44">Failed to load dashboard</p>;

  const { tasks, points, leads, clients, today_followups, today_reminders, activities } = data;

  const followUpCols = [
    { key: 'lead_name', label: 'Lead', render: (r) => r.lead_name || r.client_name || '—' },
    { key: 'lead_phone', label: 'Phone', render: (r) => r.lead_phone || r.client_phone || '—' },
    { key: 'followup_date', label: 'Time', render: (r) => new Date(r.followup_date).toLocaleTimeString() },
    { key: 'note', label: 'Note', render: (r) => r.note ? (r.note.length > 50 ? r.note.slice(0, 50) + '…' : r.note) : '—' },
  ];

  const reminderCols = [
    { key: 'title', label: 'Task' },
    { key: 'priority', label: 'Priority', render: (r) => (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize
        ${r.priority === 'urgent' ? 'border-rose-200/20 bg-rose-400/10 text-rose-100' : r.priority === 'high' ? 'border-amber-200/20 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
        {r.priority}
      </span>
    )},
    { key: 'reminder_at', label: 'Reminder At', render: (r) => new Date(r.reminder_at).toLocaleTimeString() },
  ];

  const pointCols = [
    { key: 'points', label: 'Points', render: (r) => <span className="font-bold text-emerald-200">+{r.points}</span> },
    { key: 'reason', label: 'Reason' },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  const actionLinks = [
    { label: 'Open tasks', path: '/employee/tasks', icon: 'tasks' },
    { label: 'Review follow-ups', path: '/employee/followups', icon: 'followups' },
    { label: 'Add notes', path: '/employee/notes', icon: 'notes' },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel-strong p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="glass-badge mb-4 w-fit">Personal Workspace</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white/96">Stay on top of follow-ups, reminders, and points with a calmer focused surface.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/56">This dashboard is tuned for daily execution so you can see priorities, close work quickly, and keep customer interactions moving.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {actionLinks.map((action) => (
                <Link key={action.label} to={action.path} className="glass-button">
                  <Icon name={action.icon} className="h-4 w-4" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5">
            <p className="text-sm font-semibold text-white/56">Today queue</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/36">Follow-ups</p>
                <p className="mt-2 text-3xl font-bold text-white/94">{today_followups.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/36">Reminders</p>
                <p className="mt-2 text-3xl font-bold text-white/94">{today_reminders.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Tasks" value={tasks.total} icon={<Icon name="tasks" className="h-5 w-5" />} color="purple"
          sub={`${tasks.completion_rate}% completed`} />
        <StatsCard title="Completed" value={tasks.completed} icon={<Icon name="bolt" className="h-5 w-5" />} color="green" />
        <StatsCard title="Pending" value={tasks.pending} icon={<Icon name="calendar" className="h-5 w-5" />} color="yellow" />
        <StatsCard title="Overdue" value={tasks.overdue} icon={<Icon name="activity" className="h-5 w-5" />} color="red" />
        <StatsCard title="My Points" value={points.total} icon={<Icon name="spark" className="h-5 w-5" />} color="indigo" />
        <StatsCard title="My Leads" value={leads} icon={<Icon name="leads" className="h-5 w-5" />} color="blue" />
        <StatsCard title="My Clients" value={clients} icon={<Icon name="clients" className="h-5 w-5" />} color="cyan" />
        <StatsCard title="Activities" value={(activities || []).reduce((s, a) => s + a.count, 0)} icon={<Icon name="dashboard" className="h-5 w-5" />} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white/92">Today's Follow-ups</h2>
            <p className="mt-1 text-sm text-white/44">Upcoming customer touchpoints scheduled for today.</p>
          </div>
          <DataTable columns={followUpCols} data={today_followups} emptyMsg="No follow-ups today" />
        </div>
        <div>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white/92">Today's Reminders</h2>
            <p className="mt-1 text-sm text-white/44">Tasks that need attention before they slip from the daily plan.</p>
          </div>
          <DataTable columns={reminderCols} data={today_reminders} emptyMsg="No reminders today" />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white/92">Recent Points</h2>
          <p className="mt-1 text-sm text-white/44">Track recent wins and the activity driving your performance score.</p>
        </div>
        <DataTable columns={pointCols} data={points.recent} emptyMsg="No points earned yet" />
      </div>
    </div>
  );
}
