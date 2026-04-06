import { motion } from 'framer-motion';
import Icon from './UiIcons';

export const inputClassName = 'glass-input h-11';
export const selectClassName = 'glass-input h-11 appearance-none';
export const textareaClassName = 'glass-input min-h-[100px] resize-y py-2.5';
export const primaryButtonClassName = 'glass-button glass-button-primary';
export const secondaryButtonClassName = 'glass-button';
export const paginationButtonClassName = 'glass-button min-w-[80px] justify-center px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40';
export const inlineActionClassName = 'text-xs font-medium text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-800 dark:hover:text-blue-300';
export const dangerInlineActionClassName = 'text-xs font-medium text-red-500 dark:text-red-400 transition-colors hover:text-red-700 dark:hover:text-red-300';

const toneStyles = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  sky:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  blue:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber:   'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rose:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function StatusBadge({ tone = 'default', children }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone] || toneStyles.default}`}>
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, action, actions, compact = false }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel overflow-hidden ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {description ? (
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          {action}
        </div>
      </div>
    </motion.section>
  );
}

export function FilterBar({ children }) {
  return <div className="glass-toolbar">{children}</div>;
}

export function EmptySelectionState({ icon = 'notes', title, description }) {
  return (
    <div className="glass-panel px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  );
}

export function Pagination({ page, pages, onPrevious, onNext }) {
  if (!pages || pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button disabled={page <= 1} onClick={onPrevious} className={paginationButtonClassName}>
        Previous
      </button>
      <div className="rounded-lg border px-4 py-1.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        {page} / {pages}
      </div>
      <button disabled={page >= pages} onClick={onNext} className={paginationButtonClassName}>
        Next
      </button>
    </div>
  );
}

