import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const inputBase = [
  'w-full rounded-[10px] border bg-white px-3.5 text-sm text-[#111827]',
  'placeholder-[#9ca3af] outline-none',
  'transition-all duration-200',
  'border-[#e5e7eb]',
  'focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/[0.14]',
  'dark:bg-[#1a2535] dark:border-[#2d3748] dark:text-[#e5e7eb]',
  'dark:placeholder-[#4b5563]',
  'dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/[0.18]',
].join(' ');

const TABS = [
  { id: 'email', label: 'Email' },
  { id: 'userid', label: 'User ID' },
];

export default function Login() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    const routes = {
      admin: '/admin/dashboard',
      sub_admin: '/sub-admin/dashboard',
      employee: '/employee/dashboard',
      client: '/client/dashboard',
    };
    return <Navigate to={routes[user.role] || '/'} replace />;
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEmail('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Both tabs send value via same `email` field — backend unchanged
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isEmailTab = activeTab === 'email';

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(145deg, #f8fafc 0%, #eef2f7 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: '440px' }}
      >
        {/* Single Card */}
        <div
          className="bg-white dark:bg-[#111827] border border-[#e5e7eb]/80 dark:border-[#1e293b]"
          style={{
            borderRadius: '18px',
            padding: '36px 32px 28px',
            boxShadow: '0 8px 32px -6px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)',
          }}
        >
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src="https://bimanofintax.com/wp-content/uploads/2020/07/Bimanofintax_logo.webp"
              alt="Bimano Fintax"
              style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Title + Subtitle */}
          <div className="mb-7 text-center">
            <h1
              className="text-[1.625rem] font-bold tracking-tight text-[#111827] dark:text-[#f1f5f9]"
              style={{ lineHeight: 1.2 }}
            >
              Bimano CRM
            </h1>
            <p className="mt-1.5 text-[0.8125rem] text-[#6b7280] dark:text-[#64748b]">
              Sign in to your CRM dashboard
            </p>
          </div>

          {/* Tabs — pill toggle */}
          <div
            className="mb-6 flex rounded-[10px] p-1 dark:bg-[#1e293b]"
            style={{ background: '#f1f5f9' }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className="relative flex-1 rounded-[8px] py-2 text-[0.8125rem] font-medium transition-all duration-200"
                  style={{
                    color: active ? '#fff' : '#6b7280',
                    background: active ? '#2563eb' : 'transparent',
                    boxShadow: active ? '0 2px 8px -2px rgba(37,99,235,0.45)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Error alert */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Animated identifier field */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: isEmailTab ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isEmailTab ? 12 : -12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <label
                  htmlFor="login-identifier"
                  className="mb-1.5 block text-[0.8125rem] font-medium text-[#374151] dark:text-[#cbd5e1]"
                >
                  {isEmailTab ? 'Email Address' : 'User ID'}
                </label>
                <input
                  id="login-identifier"
                  key={activeTab + '-input'}
                  type={isEmailTab ? 'email' : 'text'}
                  required
                  autoComplete={isEmailTab ? 'email' : 'username'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isEmailTab ? 'admin@bimanocrm.com' : 'Enter your User ID'}
                  className={inputBase}
                  style={{ height: '46px' }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[0.8125rem] font-medium text-[#374151] dark:text-[#cbd5e1]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputBase} pr-11`}
                  style={{ height: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[#9ca3af] transition-colors duration-150 hover:text-[#4b5563] dark:hover:text-[#94a3b8]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-[10px] text-[0.9375rem] font-semibold text-white transition-all duration-200 hover:scale-[1.015] hover:shadow-lg active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
              style={{
                height: '48px',
                background: loading
                  ? '#2563eb'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: loading ? 'none' : '0 2px 12px -2px rgba(37,99,235,0.45)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-[10px] border border-[#f1f5f9] bg-[#f8fafc] px-4 py-2.5 text-center dark:border-[#1e293b] dark:bg-[#0f172a]">
            <p className="text-[0.72rem] text-[#9ca3af] dark:text-[#475569]">
              Demo &mdash;{' '}
              <span className="font-medium text-[#6b7280] dark:text-[#64748b]">admin@test.com</span>
              {' / '}
              <span className="font-medium text-[#6b7280] dark:text-[#64748b]">1234</span>
            </p>
          </div>

          {/* Preview link */}
          <div className="mt-4 text-center">
            <Link
              to="/preview/admin-dashboard"
              className="inline-flex items-center gap-1.5 text-[0.75rem] text-[#9ca3af] transition-colors duration-150 hover:text-[#2563eb] dark:text-[#475569] dark:hover:text-[#60a5fa]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview admin dashboard
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
