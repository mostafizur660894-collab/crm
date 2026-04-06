import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import Icon from '../../components/UiIcons';

export default function SubAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard/sub-admin')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="py-10 text-center text-white/44">Failed to load dashboard</p>;

  const { overview, leads_by_status, today_followups, recent_activity } = data;

  const activityCols = [
    { key: 'user_name', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'module', label: 'Module' },
    { key: 'created_at', label: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
  ];

  const actions = [
    { label: 'Prioritize leads', path: '/sub-admin/leads', icon: 'leads' },
    { label: 'Track tasks', path: '/sub-admin/tasks', icon: 'tasks' },
    { label: 'Review leaderboard', path: '/sub-admin/leaderboard', icon: 'trophy' },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel-strong p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="glass-badge mb-4 w-fit">Team Operations</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white/96">Keep execution tight with a cleaner team pulse and faster follow-up rhythm.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/56">Your sub-admin view is optimized for lead momentum, team output, and operational follow-through with less visual noise.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/sub-admin/leads" className="glass-button glass-button-primary">
                <Icon name="arrowUpRight" className="h-4 w-4" />
                Review Leads
              </Link>
              <Link to="/sub-admin/tasks" className="glass-button">
                <Icon name="tasks" className="h-4 w-4" />
                Open Tasks
              </Link>
            </div>
          </div>
          <div className="glass-panel p-5">
            <p className="text-sm font-semibold text-white/56">Today follow-ups</p>
            <p className="mt-2 text-4xl font-extrabold text-white/96">{today_followups}</p>
            <p className="mt-2 text-sm text-white/44">Scheduled follow-ups queued for your team today.</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/6">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-300/90 to-cyan-300/45" style={{ width: `${Math.max(20, Math.min(100, today_followups * 8))}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Leads" value={overview.total_leads} icon={<Icon name="leads" className="h-5 w-5" />} color="blue" />
        <StatsCard title="Total Clients" value={overview.total_clients} icon={<Icon name="clients" className="h-5 w-5" />} color="green" />
        <StatsCard title="Total Tasks" value={overview.total_tasks} icon={<Icon name="tasks" className="h-5 w-5" />} color="purple"
          sub={`${overview.task_completion_rate}% completed`} />
        <StatsCard title="Total Points" value={overview.total_points} icon={<Icon name="spark" className="h-5 w-5" />} color="yellow" />
        <StatsCard title="Employees" value={overview.total_employees} icon={<Icon name="users" className="h-5 w-5" />} color="indigo" />
        <StatsCard title="Today Follow-ups" value={today_followups} icon={<Icon name="followups" className="h-5 w-5" />} color="pink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-5">
          <h2 className="text-lg font-bold text-white/92">Leads by Status</h2>
          <p className="mt-1 text-sm text-white/44">Spot stalled lead groups and rebalance the team’s workload.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {leads_by_status.map((s) => (
              <div key={s.status} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{s.status}</p>
                <p className="mt-3 text-2xl font-bold text-white/94">{s.count}</p>
              </div>
            ))}
            {leads_by_status.length === 0 && <p className="text-sm text-white/44">No leads yet</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="glass-panel p-5">
          <h2 className="text-lg font-bold text-white/92">Quick Actions</h2>
          <p className="mt-1 text-sm text-white/44">Move from monitoring to action without leaving the dashboard.</p>
          <div className="mt-5 space-y-3">
            {actions.map((action) => (
              <Link key={action.label} to={action.path} className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-4 transition-all duration-300 hover:border-sky-300/22 hover:bg-white/[0.08]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/16 bg-sky-400/10 text-sky-100">
                  <Icon name={action.icon} className="h-4 w-4" />
                </div>
                <span className="font-semibold text-white/88">{action.label}</span>
                <Icon name="chevronRight" className="ml-auto h-4 w-4 text-white/32" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white/92">Recent Activity</h2>
          <p className="mt-1 text-sm text-white/44">A concise stream of current actions across the supervised team.</p>
        </div>
        <DataTable columns={activityCols} data={recent_activity} emptyMsg="No recent activity" />
      </motion.div>
    </div>
  );
}
