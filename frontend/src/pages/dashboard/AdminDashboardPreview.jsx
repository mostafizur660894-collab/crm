import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../../components/UiIcons';

/* ── Static preview data ─────────────────────────────── */
const overview = {
  total_leads: 284, total_clients: 96, total_tasks: 142,
  task_completion_rate: 78, total_points: 12460,
  total_employees: 18, total_branches: 5,
};
const today = { new_leads: 24, tasks_completed: 31 };

const leads_by_status = [
  { status: 'New',       count: 18, from: '#38bdf8', to: '#3b82f6' },
  { status: 'Contacted', count: 27, from: '#a78bfa', to: '#8b5cf6' },
  { status: 'Qualified', count: 14, from: '#34d399', to: '#10b981' },
  { status: 'Proposal',  count: 9,  from: '#fbbf24', to: '#f59e0b' },
  { status: 'Converted', count: 12, from: '#4ade80', to: '#22c55e' },
  { status: 'Lost',      count: 4,  from: '#f87171', to: '#ef4444' },
];

const recent_activity = [
  { id: 1, user: 'Ava Chen',    action: 'Created lead',         module: 'Leads',    time: '2:12 PM', dot: '#3b82f6' },
  { id: 2, user: 'Marcus Lee',  action: 'Assigned follow-up',   module: 'Tasks',    time: '1:48 PM', dot: '#8b5cf6' },
  { id: 3, user: 'Noah Patel',  action: 'Converted client',     module: 'Clients',  time: '12:35 PM',dot: '#22c55e' },
  { id: 4, user: 'Sophia Kim',  action: 'Updated branch target',module: 'Branches', time: '10:22 AM',dot: '#f59e0b' },
];

/* ── Stats card definitions ──────────────────────────── */
const STATS = [
  { title: 'Total Leads',     value: overview.total_leads,        icon: 'leads',       grad: ['#2563eb','#1d4ed8'], ring: 'rgba(59,130,246,0.35)',  iconFg: '#93c5fd' },
  { title: 'Total Clients',   value: overview.total_clients,      icon: 'clients',     grad: ['#059669','#047857'], ring: 'rgba(52,211,153,0.35)',  iconFg: '#6ee7b7' },
  { title: 'Total Tasks',     value: overview.total_tasks,        icon: 'tasks',       grad: ['#7c3aed','#6d28d9'], ring: 'rgba(167,139,250,0.35)', iconFg: '#c4b5fd', sub: '78% completed' },
  { title: 'Total Points',    value: overview.total_points,       icon: 'spark',       grad: ['#d97706','#b45309'], ring: 'rgba(251,191,36,0.35)',  iconFg: '#fde68a' },
  { title: 'Employees',       value: overview.total_employees,    icon: 'users',       grad: ['#4f46e5','#4338ca'], ring: 'rgba(129,140,248,0.35)', iconFg: '#a5b4fc' },
  { title: 'Branches',        value: overview.total_branches,     icon: 'office',      grad: ['#0891b2','#0e7490'], ring: 'rgba(34,211,238,0.35)',  iconFg: '#67e8f9' },
  { title: "Today's Leads",   value: today.new_leads,             icon: 'arrowUpRight',grad: ['#db2777','#be185d'], ring: 'rgba(244,114,182,0.35)', iconFg: '#fbcfe8' },
  { title: 'Tasks Done Today',value: today.tasks_completed,       icon: 'bolt',        grad: ['#16a34a','#15803d'], ring: 'rgba(74,222,128,0.35)',  iconFg: '#86efac' },
];

/* ── Quick actions ───────────────────────────────────── */
const ACTIONS = [
  { icon: 'plus',  label: 'Add Lead',     desc: 'Capture a new opportunity and route it instantly.',       accent: '#3b82f6', glow: 'rgba(59,130,246,0.22)' },
  { icon: 'tasks', label: 'Assign Tasks', desc: 'Distribute work with full visibility across teams.',       accent: '#8b5cf6', glow: 'rgba(139,92,246,0.22)' },
  { icon: 'users', label: 'Review Team',  desc: 'Inspect user activity and performance from one view.',     accent: '#10b981', glow: 'rgba(16,185,129,0.22)' },
];

/* ── Module badge colours ────────────────────────────── */
const MODULE_COLORS = {
  Leads:    { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd' },
  Tasks:    { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
  Clients:  { bg: 'rgba(34,197,94,0.15)',  text: '#86efac' },
  Branches: { bg: 'rgba(245,158,11,0.15)', text: '#fde68a' },
};

/* ── Fade-in variants ────────────────────────────────── */
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1], delay },
});

export default function AdminDashboardPreview() {
  return (
    /* Full-page dark gradient — self-contained, no system theme dependency */
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #060c1a 0%, #0b1628 40%, #0f172a 100%)',
        padding: '28px 20px 48px',
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <motion.div {...fade(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              color: '#93c5fd', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', borderRadius: '999px', padding: '3px 10px',
              marginBottom: '10px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              Preview Mode
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.15, margin: 0 }}>
              Admin Dashboard
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(148,163,184,0.8)' }}>
              Static showcase — no login required
            </p>
          </div>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1', fontSize: '13px', fontWeight: 500,
              borderRadius: '10px', padding: '9px 16px',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
          >
            <Icon name="logout" style={{ width: 15, height: 15 }} />
            Back to Login
          </Link>
        </motion.div>

        {/* ── Hero panel ── */}
        <motion.div
          {...fade(0.06)}
          style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(109,40,217,0.12) 50%, rgba(15,23,42,0.6) 100%)',
            border: '1px solid rgba(59,130,246,0.22)',
            padding: '32px',
            marginBottom: '24px',
            backdropFilter: 'blur(12px)',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '12px' }}>
              Executive Overview
            </p>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 12px' }}>
              Run pipeline, people &amp; activity{' '}
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                from one surface.
              </span>
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.85)', lineHeight: 1.7, margin: '0 0 20px', maxWidth: '520px' }}>
              Live CRM performance, recent team actions, and quick entry points inside a premium layered workspace.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                borderRadius: '10px', padding: '10px 18px', cursor: 'default',
                boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
              }}>
                <Icon name="arrowUpRight" style={{ width: 15, height: 15 }} />
                Open Lead Pipeline
              </button>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                color: '#cbd5e1', fontSize: '13px', fontWeight: 500,
                borderRadius: '10px', padding: '10px 16px', cursor: 'default',
              }}>
                <Icon name="trophy" style={{ width: 15, height: 15 }} />
                View Leaderboard
              </button>
            </div>
          </div>

          {/* Snapshot mini-card */}
          <div style={{
            background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '20px 24px', minWidth: '220px',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Task Completion</p>
            <p style={{ fontSize: '38px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1 }}>
              {overview.task_completion_rate}
              <span style={{ fontSize: '20px', color: '#60a5fa' }}>%</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Leads',  val: today.new_leads,       col: '#60a5fa' },
                { label: 'Done',   val: today.tasks_completed,  col: '#4ade80' },
                { label: 'Points', val: overview.total_points,  col: '#fbbf24' },
              ].map((m) => (
                <div key={m.label} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '10px 6px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: '10px', color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{m.label}</p>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: m.col, margin: 0 }}>{m.val.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Stats grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.title}
              {...fade(0.08 + i * 0.04)}
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid ${s.ring}`,
                borderRadius: '16px', padding: '18px 20px',
                position: 'relative', overflow: 'hidden',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Glow accent */}
              <div style={{
                position: 'absolute', top: -30, right: -24,
                width: 80, height: 80, borderRadius: '50%',
                background: `radial-gradient(circle, ${s.ring} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(148,163,184,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    {s.title}
                  </p>
                  <p style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', margin: 0 }}>
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                  {s.sub && <p style={{ fontSize: '11px', color: s.iconFg, marginTop: '4px' }}>{s.sub}</p>}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 14px ${s.ring}`,
                  color: '#fff',
                }}>
                  <Icon name={s.icon} style={{ width: 18, height: 18 }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Lead funnel + Quick actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px', marginBottom: '24px' }}>

          {/* Lead Status Breakdown */}
          <motion.div {...fade(0.18)} style={{
            background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '18px', padding: '22px', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Lead Status Breakdown</h3>
                <p style={{ fontSize: '12px', color: 'rgba(148,163,184,0.7)', margin: 0 }}>Monitor funnel pressure &amp; conversion points</p>
              </div>
              <span style={{
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
                color: '#60a5fa', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', borderRadius: '999px', padding: '3px 9px',
              }}>
                Live funnel
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {leads_by_status.map((item) => (
                <div key={item.status} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '14px 12px',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(148,163,184,0.65)', margin: '0 0 8px' }}>
                    {item.status}
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                    {item.count}
                  </p>
                  <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: `linear-gradient(90deg, ${item.from}, ${item.to})`,
                      width: `${Math.max(15, Math.min(100, item.count * 4))}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div {...fade(0.22)} style={{
            background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '18px', padding: '22px', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Quick Actions</h3>
                <p style={{ fontSize: '12px', color: 'rgba(148,163,184,0.7)', margin: 0 }}>High-velocity shortcuts for common decisions</p>
              </div>
              <Icon name="bolt" style={{ width: 18, height: 18, color: '#fbbf24' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ACTIONS.map((a) => (
                <div key={a.label} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '14px 16px',
                  transition: 'all 0.2s', cursor: 'default',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
                    background: `rgba(${a.accent === '#3b82f6' ? '59,130,246' : a.accent === '#8b5cf6' ? '139,92,246' : '16,185,129'},0.18)`,
                    border: `1px solid ${a.accent}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: a.accent,
                  }}>
                    <Icon name={a.icon} style={{ width: 18, height: 18 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 2px' }}>{a.label}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.65)', margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
                  </div>
                  <Icon name="chevronRight" style={{ width: 14, height: 14, color: 'rgba(148,163,184,0.4)' }} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Recent Activity ── */}
        <motion.div {...fade(0.26)} style={{
          background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px', padding: '22px', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Recent Activity</h3>
              <p style={{ fontSize: '12px', color: 'rgba(148,163,184,0.7)', margin: 0 }}>Live audit stream of the latest team actions</p>
            </div>
            <span style={{
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
              color: '#4ade80', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', borderRadius: '999px', padding: '3px 9px',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Live
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['User', 'Action', 'Module', 'Time'].map((h) => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontSize: '10px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: 'rgba(148,163,184,0.6)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent_activity.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: i < recent_activity.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${row.dot}33, ${row.dot}22)`,
                          border: `1px solid ${row.dot}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: row.dot,
                        }}>
                          {row.user.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{row.user}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: '13px', color: 'rgba(203,213,225,0.85)' }}>{row.action}</td>
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        background: (MODULE_COLORS[row.module] || MODULE_COLORS.Leads).bg,
                        color: (MODULE_COLORS[row.module] || MODULE_COLORS.Leads).text,
                        fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '3px 9px',
                      }}>
                        {row.module}
                      </span>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: '12px', color: 'rgba(148,163,184,0.65)' }}>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
