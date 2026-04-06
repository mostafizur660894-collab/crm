import { motion } from 'framer-motion';

const colorMap = {
  indigo:  { wrap: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',   bar: 'bg-blue-500' },
  green:   { wrap: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  blue:    { wrap: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',   bar: 'bg-blue-500' },
  yellow:  { wrap: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',  bar: 'bg-amber-400' },
  red:     { wrap: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',       bar: 'bg-red-500'   },
  purple:  { wrap: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500' },
  pink:    { wrap: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',   bar: 'bg-pink-500' },
  cyan:    { wrap: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',   bar: 'bg-cyan-500' },
};

export default function StatsCard({ title, value, icon, color = 'indigo', sub }) {
  const c = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel glass-card-hover p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
          <p className="mt-1.5 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
          {sub && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${c.wrap}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
