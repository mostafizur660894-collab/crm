import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

// Lazy-loaded pages
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));
const AdminDashboardPreview = lazy(() => import('./pages/dashboard/AdminDashboardPreview'));
const SubAdminDashboard = lazy(() => import('./pages/dashboard/SubAdminDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/dashboard/EmployeeDashboard'));
const ClientDashboard = lazy(() => import('./pages/dashboard/ClientDashboard'));
const Users = lazy(() => import('./pages/Users'));
const Branches = lazy(() => import('./pages/Branches'));
const Categories = lazy(() => import('./pages/Categories'));
const Leads = lazy(() => import('./pages/Leads'));
const Clients = lazy(() => import('./pages/Clients'));
const Tasks = lazy(() => import('./pages/Tasks'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Notes = lazy(() => import('./pages/Notes'));
const Sheets = lazy(() => import('./pages/Sheets'));
const SheetLiveView = lazy(() => import('./pages/SheetLiveView'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
        <span className="text-sm font-medium text-soft">Loading…</span>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const routes = {
    admin: '/admin/dashboard',
    sub_admin: '/sub-admin/dashboard',
    employee: '/employee/dashboard',
    client: '/client/dashboard',
  };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/preview/admin-dashboard" element={<AdminDashboardPreview />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="branches" element={<Branches />} />
        <Route path="categories" element={<Categories />} />
        <Route path="leads" element={<Leads />} />
        <Route path="clients" element={<Clients />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="followups" element={<FollowUps />} />
        <Route path="notes" element={<Notes />} />
        <Route path="sheets" element={<Sheets />} />
        <Route path="sheets/:id" element={<SheetLiveView />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Sub-admin routes */}
      <Route path="/sub-admin" element={<ProtectedRoute roles={['admin', 'sub_admin']}><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<SubAdminDashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="clients" element={<Clients />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="followups" element={<FollowUps />} />
        <Route path="notes" element={<Notes />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Employee routes */}
      <Route path="/employee" element={<ProtectedRoute roles={['admin', 'sub_admin', 'employee']}><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="followups" element={<FollowUps />} />
        <Route path="notes" element={<Notes />} />
      </Route>

      {/* Client routes */}
      <Route path="/client" element={<ProtectedRoute roles={['admin', 'client']}><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<ClientDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
