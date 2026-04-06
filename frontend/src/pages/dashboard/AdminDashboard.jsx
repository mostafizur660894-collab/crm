import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import Icon from '../../components/UiIcons';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard/admin')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="py-10 text-center text-white/44">Failed to load dashboard</p>;

  const { overview, today, leads_by_status, recent_activity } = data;

  const activityCols = [
    { key: 'user_name', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'module', label: 'Module' },
    {
      key: 'created_at', label: 'Time',
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
  ];

  const quickActions = [
    { label: 'Add Lead', description: 'Capture a new opportunity and route it instantly.', path: '/admin/leads', icon: 'plus' },
    { label: 'Assign Tasks', description: 'Distribute work with full visibility across teams.', path: '/admin/tasks', icon: 'tasks' },
    { label: 'Review Team', description: 'Inspect user activity and performance from one view.', path: '/admin/users', icon: 'users' },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel-strong overflow-hidden p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div>
            <div className="glass-badge mb-4 w-fit">Executive Overview</div>
            <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-white/96 sm:text-3xl lg:text-4xl">Run pipeline, people, and activity from a single premium control surface.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">This dashboard combines live CRM performance, recent team actions, and quick operational entry points inside a layered glass workspace.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/leads" className="glass-button glass-button-primary">
                <Icon name="arrowUpRight" className="h-4 w-4" />
                Open Lead Pipeline
              </Link>
              <Link to="/admin/leaderboard" className="glass-button">
                <Icon name="trophy" className="h-4 w-4" />
                View Leaderboard
              </Link>
            </div>
          </div>

          <div className="glass-panel p-5 hidden lg:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/56">Live health snapshot</p>
                <p className="mt-2 text-3xl font-extrabold text-white/96">{overview.task_completion_rate}%</p>
                <p className="mt-2 text-sm text-white/48">Task completion rate across your active workspace.</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-400/10 text-sky-100">
                <Icon name="activity" className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/36">Leads</p>
                <p className="mt-2 text-xl font-bold text-white/92">{today.new_leads}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/36">Done</p>
                <p className="mt-2 text-xl font-bold text-white/92">{today.tasks_completed}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/36">Points</p>
                <p className="mt-2 text-xl font-bold text-white/92">{overview.total_points}</p>
              </div>
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
        <StatsCard title="Branches" value={overview.total_branches} icon={<Icon name="office" className="h-5 w-5" />} color="cyan" />
        <StatsCard title="Today Leads" value={today.new_leads} icon={<Icon name="arrowUpRight" className="h-5 w-5" />} color="pink" />
        <StatsCard title="Today Completed" value={today.tasks_completed} icon={<Icon name="bolt" className="h-5 w-5" />} color="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white/92">Lead Status Breakdown</h2>
              <p className="mt-1 text-sm text-white/46">Monitor funnel pressure and identify the next intervention point.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">Live funnel</div>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
            {leads_by_status.map((s) => (
              <div key={s.status} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{s.status}</p>
                <p className="mt-3 text-2xl font-bold text-white/94">{s.count}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-300/90 to-blue-300/45" style={{ width: `${Math.max(18, Math.min(100, s.count * 10))}%` }} />
                </div>
              </div>
            ))}
            {leads_by_status.length === 0 && <p className="text-sm text-white/44">No leads yet</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white/92">Quick Actions</h2>
              <p className="mt-1 text-sm text-white/46">High-velocity shortcuts for the most common CRM decisions.</p>
            </div>
            <Icon name="bolt" className="h-5 w-5 text-sky-100" />
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.path} className="group flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4 transition-all duration-300 hover:border-sky-300/22 hover:bg-white/[0.08] hover:shadow-[0_18px_34px_rgba(38,93,196,0.18)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/16 bg-sky-400/10 text-sky-100">
                  <Icon name={action.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white/92">{action.label}</p>
                  <p className="mt-1 text-sm text-white/44">{action.description}</p>
                </div>
                <Icon name="chevronRight" className="h-4 w-4 text-white/36 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white/70" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white/92">Recent Activity</h2>
            <p className="mt-1 text-sm text-white/44">A live audit stream of the latest team actions across the CRM.</p>
          </div>
          <div className="glass-badge hidden sm:inline-flex">Live team ops</div>
        </div>
        <DataTable columns={activityCols} data={recent_activity} emptyMsg="No recent activity" />
      </motion.div>
    </div>
  );
}
