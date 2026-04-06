import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Icon from './UiIcons';
import { toggleTheme, isDarkMode } from '../utils/theme';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(() => isDarkMode());
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  const pageTitle = location.pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .join(' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Dashboard';

  const normalizedTitle = pageTitle
    .replace('Users', 'Employees')
    .replace('Sheets', 'Live Sheets');

  const fetchNotifications = () => {
    API.get('/notifications', { params: { limit: 10 } })
      .then((res) => {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    API.put('/notifications/read-all')
      .then(() => { setUnreadCount(0); setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 }))); })
      .catch(() => {});
  };

  const markOneRead = (id) => {
    API.put(`/notifications/${id}/read`).then(() => {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }).catch(() => {});
  };

  const handleToggleTheme = () => {
    const dark = toggleTheme();
    setIsDark(dark);
  };

  const iconBtn = `flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150
    hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0`;

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center gap-3 border-b bg-white px-4 dark:bg-slate-900"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className={`${iconBtn} lg:hidden`}
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <Icon name="menu" className="h-4 w-4" />
      </button>

      {/* Page title */}
      <h1
        className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base"
        style={{ color: 'var(--text-primary)' }}
      >
        {normalizedTitle}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((o) => !o)}
            className={iconBtn}
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Icon name="bell" className="h-4 w-4" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border bg-white dark:bg-slate-900 notif-dropdown"
                style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</p>
                  ) : notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markOneRead(n.id)}
                      className={`cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800
                        ${!n.is_read ? 'bg-blue-50/70 dark:bg-blue-900/10' : ''}`}
                    >
                      <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`} style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      {n.message && <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{n.message}</p>}
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={handleToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={iconBtn}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Icon name={isDark ? 'sun' : 'moon'} className="h-4 w-4" />
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile((o) => !o)}
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden max-w-[100px] truncate font-medium sm:block" style={{ color: 'var(--text-primary)' }}>
              {user?.name}
            </span>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border bg-white dark:bg-slate-900"
                style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p className="mt-0.5 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setShowProfile(false); logout(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                  >
                    <Icon name="logout" className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
