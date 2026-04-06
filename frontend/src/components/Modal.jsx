import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60"
            onClick={onClose}
          />

          {/* Sheet — slides up on mobile, scales in on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`
              relative z-10 w-full overflow-y-auto border bg-white dark:bg-slate-900
              max-h-[92dvh]
              rounded-t-2xl md:rounded-xl
              px-4 py-5 md:p-6
              ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'}
            `}
            style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Drag handle (mobile only) */}
            <div className="mb-4 flex justify-center md:hidden">
              <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border-strong)' }} />
            </div>

            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
