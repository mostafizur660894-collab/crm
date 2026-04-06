import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import Icon from './UiIcons';

const menuByRole = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Clients', path: '/admin/clients', icon: 'clients' },
    { label: 'Leads', path: '/admin/leads', icon: 'leads' },
    { label: 'Categories', path: '/admin/categories', icon: 'tag' },
    { label: 'Tasks', path: '/admin/tasks', icon: 'tasks' },
    { label: 'Live Sheets', path: '/admin/sheets', icon: 'sheets' },
    { label: 'Employees', path: '/admin/users', icon: 'users' },
    { label: 'Settings', path: '/admin/settings', icon: 'settings' },
  ],
  sub_admin: [
    { label: 'Dashboard', path: '/sub-admin/dashboard', icon: 'dashboard' },
    { label: 'Clients', path: '/sub-admin/clients', icon: 'clients' },
    { label: 'Leads', path: '/sub-admin/leads', icon: 'leads' },
    { label: 'Tasks', path: '/sub-admin/tasks', icon: 'tasks' },
    { label: 'Follow-ups', path: '/sub-admin/followups', icon: 'followups' },
    { label: 'Notes', path: '/sub-admin/notes', icon: 'notes' },
    { label: 'Leaderboard', path: '/sub-admin/leaderboard', icon: 'trophy' },
  ],
  employee: [
    { label: 'Dashboard', path: '/employee/dashboard', icon: 'dashboard' },
    { label: 'My Tasks', path: '/employee/tasks', icon: 'tasks' },
    { label: 'Follow-ups', path: '/employee/followups', icon: 'followups' },
    { label: 'Notes', path: '/employee/notes', icon: 'notes' },
  ],
  client: [
    { label: 'Dashboard', path: '/client/dashboard', icon: 'dashboard' },
  ],
};

function NavItem({ item, active, collapsed, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150
        ${collapsed ? 'justify-center' : 'gap-3'}
        ${active
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-600/15 dark:text-blue-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-0.5 rounded-r-full bg-blue-600 dark:bg-blue-400" />
      )}
      <Icon name={item.icon} className="h-[18px] w-[18px] flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarContent({ items, location, collapsed, onToggleCollapse, onItemClick }) {
  return (
    <>
      {/* Logo */}
      <div
        className={`flex h-[57px] flex-shrink-0 items-center border-b px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
          <Icon name="spark" className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            Bimano CRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {items.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapse && (
        <div className="flex-shrink-0 border-t p-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150
              text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300
              ${collapsed ? 'justify-center' : 'gap-3'}`}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} className="h-3.5 w-3.5 flex-shrink-0" />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </>
  );
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { user } = useAuth();
  const location = useLocation();
  const items = menuByRole[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col overflow-hidden border-r
          bg-white dark:bg-slate-900 transform transition-transform duration-300 lg:hidden
          ${open ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <SidebarContent
          items={items}
          location={location}
          collapsed={false}
          onItemClick={onClose}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`relative hidden h-screen flex-shrink-0 flex-col border-r
          bg-white dark:bg-slate-900 transition-all duration-300 lg:flex
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <SidebarContent
          items={items}
          location={location}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>
    </>
  );
}
