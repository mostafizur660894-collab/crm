import { useAuth } from '../context/AuthContext';
import { PageHeader, StatusBadge } from '../components/CrmUI';
import Icon from '../components/UiIcons';

const settingsSections = [
  {
    title: 'Workspace Style',
    description: 'The CRM now runs on the same blue-glass system used by the login and dashboard experience.',
    icon: 'spark',
  },
  {
    title: 'Security Surface',
    description: 'Review role access, branch visibility, and notification flow before expanding permissions.',
    icon: 'users',
  },
  {
    title: 'Operations',
    description: 'Use categories, live sheets, and task assignments to keep work tracked inside one consistent control layer.',
    icon: 'activity',
  },
];

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace Settings"
        title="Tune your CRM workspace without breaking the operational flow."
        description="This screen centralizes the core workspace guidance and account context while preserving the same glass treatment across the full CRM."
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel-strong p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/16 bg-sky-400/10 text-sky-100">
              <Icon name="user" className="h-6 w-6" />
            </div>
            <div>
              <div className="glass-badge mb-3 w-fit">Current Session</div>
              <h2 className="text-xl font-bold text-white/94">{user?.name || 'Workspace User'}</h2>
              <p className="mt-2 text-sm text-white/48">Signed in with a protected role and the same premium dashboard shell used across the CRM.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge tone="sky">{user?.role?.replace('_', ' ') || 'Role unavailable'}</StatusBadge>
                {user?.branch_name ? <StatusBadge tone="blue">{user.branch_name}</StatusBadge> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold text-white/92">Design Intent</h2>
          <p className="mt-2 text-sm leading-7 text-white/48">
            The interface now stays inside one visual system: dark blue gradients, subtle grid texture, glass cards, restrained blue glow, and smoother hover motion.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settingsSections.map((section) => (
          <article key={section.title} className="glass-panel glass-card-hover p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/16 bg-sky-400/10 text-sky-100">
              <Icon name={section.icon} className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white/92">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/46">{section.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}