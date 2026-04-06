import { motion } from 'framer-motion';

export default function DataTable({ columns, data, emptyMsg = 'No data found' }) {
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel px-6 py-12 text-center"
      >
        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>{emptyMsg}</p>
      </motion.div>
    );
  }

  const dataCols  = columns.filter((c) => c.key !== 'actions');
  const actionCol = columns.find((c) => c.key === 'actions');
  const primaryCol = dataCols[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-panel overflow-hidden"
    >

      {/* ── Mobile card list (< md) ─────────────────────── */}
      <div className="divide-y md:hidden" style={{ borderColor: 'var(--border)' }}>
        {data.map((row, i) => (
          <div
            key={row.id || i}
            className="px-4 py-3.5 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            {/* Primary field as card title */}
            {primaryCol && (
              <p className="truncate text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {primaryCol.render ? primaryCol.render(row, i) : (row[primaryCol.key] ?? '—')}
              </p>
            )}
            {/* Remaining fields as label:value pairs */}
            <dl className="space-y-1">
              {dataCols.slice(1).map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {col.label}
                  </dt>
                  <dd className="text-right text-xs min-w-0" style={{ color: 'var(--text-primary)' }}>
                    {col.render ? col.render(row, i) : (row[col.key] ?? '—')}
                  </dd>
                </div>
              ))}
            </dl>
            {/* Actions */}
            {actionCol && (
              <div className="mt-3 flex flex-wrap gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                {actionCol.render(row, i)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table (≥ md) ────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-b transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                style={{ borderColor: 'var(--border)' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {col.render ? col.render(row, i) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </motion.div>
  );
}
