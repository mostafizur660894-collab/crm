import { useState, useEffect } from 'react';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/CrmUI';

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('employees');
  const [period, setPeriod] = useState('month');
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { period };
    const requests = [
      API.get('/leaderboard', { params }),
      API.get('/leaderboard/branches', { params }),
      API.get('/leaderboard/analytics'),
    ];
    Promise.all(requests)
      .then(([eRes, bRes, aRes]) => {
        setEmployees(eRes.data.data || []);
        setBranches(bRes.data.data || []);
        setAnalytics(aRes.data.data || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const medalIcon = (i) => {
    if (i === 0) return '#1';
    if (i === 1) return '#2';
    if (i === 2) return '#3';
    return `#${i + 1}`;
  };

  const empColumns = [
    { key: 'rank', label: 'Rank', render: (r) => (
      <span className="font-bold text-lg text-sky-100">{medalIcon(r.rank - 1)}</span>
    )},
    { key: 'name', label: 'Employee', render: (r) => (
      <div>
        <div className="font-medium text-white/92">{r.name}</div>
        <div className="text-xs text-white/42">{r.branch_name}</div>
      </div>
    )},
    { key: 'total_points', label: 'Points', render: (r) => (
      <span className="text-lg font-bold text-sky-100">{r.total_points}</span>
    )},
    { key: 'point_entries', label: 'Entries', render: (r) => r.point_entries ?? 0 },
  ];

  const branchColumns = [
    { key: 'rank', label: 'Rank', render: (r) => (
      <span className="font-bold text-lg text-sky-100">{medalIcon(r.rank - 1)}</span>
    )},
    { key: 'name', label: 'Branch' },
    { key: 'total_points', label: 'Points', render: (r) => (
      <span className="text-lg font-bold text-sky-100">{r.total_points}</span>
    )},
    { key: 'active_employees', label: 'Active Employees' },
    { key: 'avg', label: 'Avg/Employee', render: (r) =>
      r.active_employees > 0 ? (r.total_points / r.active_employees).toFixed(1) : '0.0'
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance Leaderboard"
        title="Track performance without breaking the premium blue-glass design system."
        description="Rank employees and branches with calmer hierarchy, cleaner spacing, and blue-only emphasis across the whole leaderboard view."
        action={
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="glass-input h-12 w-44 appearance-none">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <>
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard title="Lead Conversion" value={`${analytics.rates?.lead_conversion_rate ?? 0}%`} color="indigo" />
              <StatsCard title="Task Completion" value={`${analytics.rates?.task_completion_rate ?? 0}%`} color="green" />
              <StatsCard title="Avg Pts/Employee" value={analytics.rates?.avg_points_per_employee ?? 0} color="blue" />
              <StatsCard title="Top Performer" value={employees[0]?.name || '—'} sub={employees[0] ? `${employees[0].total_points} pts` : ''} color="yellow" />
            </div>
          )}

          <div className="flex w-fit rounded-[22px] border border-white/10 bg-white/[0.04] p-1">
            {['employees', 'branches'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`glass-tab capitalize ${tab === t ? 'glass-tab-active' : ''}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'employees' ? (
            <div>
              {employees.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {employees.slice(0, 3).map((emp, i) => (
                    <div key={emp.id || i} className="glass-panel glass-card-hover p-5 text-center">
                      <div className="mb-1 text-3xl text-sky-100">{medalIcon(i)}</div>
                      <div className="font-bold text-white/92">{emp.name}</div>
                      <div className="mb-2 text-xs text-white/42">{emp.branch_name}</div>
                      <div className="text-2xl font-bold text-sky-100">{emp.total_points} <span className="text-sm font-normal text-white/42">pts</span></div>
                    </div>
                  ))}
                </div>
              )}
              <DataTable columns={empColumns} data={employees} emptyMsg="No data for this period" />
            </div>
          ) : (
            <DataTable columns={branchColumns} data={branches} emptyMsg="No branch data for this period" />
          )}
        </>
      )}
    </div>
  );
}
