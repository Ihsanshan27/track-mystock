import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { PermissionProvider, usePermissions } from './context/PermissionContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import Layout from './components/Layout/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TradesPage from './pages/TradesPage';
import NewTradePage from './pages/NewTradePage';
import TradeDetailPage from './pages/TradeDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PortfolioPage from './pages/PortfolioPage';
import CalculatorPage from './pages/CalculatorPage';
import WatchlistPage from './pages/WatchlistPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import CashflowPage from './pages/CashflowPage';
import DividendPage from './pages/DividendPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminWorkspacesPage from './pages/AdminWorkspacesPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import SharedReportPage from './pages/SharedReportPage';
import MentorTradersPage from './pages/MentorTradersPage';
import MentorTraderDetailPage from './pages/MentorTraderDetailPage';
import DatabaseSetupNotice from './components/DatabaseSetupNotice';
import AccessDenied from './components/AccessDenied';
import StateMessage from './components/StateMessage';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <PermissionProvider>
      <WorkspaceProvider>
        <DataProvider>
          <Layout>
            <AppLoadingGate>
              <Outlet />
            </AppLoadingGate>
          </Layout>
        </DataProvider>
      </WorkspaceProvider>
    </PermissionProvider>
  );
}

function AppLoadingGate({ children }) {
  const { dataLoading, dataError, databaseSetupError } = useData();
  const { roleLoading, roleError, roleSetupError, refreshProfile } = usePermissions();
  const { workspaceLoading, workspaceError, workspaceSetupError, refreshWorkspaces } = useWorkspace();
  if (dataLoading || roleLoading || workspaceLoading) return <div className="loading-spinner" />;
  if (databaseSetupError || roleSetupError || workspaceSetupError) {
    return (
      <DatabaseSetupNotice
        error={databaseSetupError || roleSetupError || workspaceSetupError}
        onRetry={() => {
          refreshProfile();
          refreshWorkspaces();
          window.location.reload();
        }}
      />
    );
  }
  if (dataError || roleError || workspaceError) {
    return (
      <StateMessage
        tone="danger"
        title="Gagal memuat aplikasi"
        description={dataError || roleError || workspaceError}
        actionLabel="Muat Ulang"
        onAction={() => window.location.reload()}
      />
    );
  }
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, roleLabel, roleLoading } = usePermissions();
  if (roleLoading) return <div className="loading-spinner" />;
  if (!isAdmin) return <AccessDenied roleLabel={roleLabel} />;
  return children;
}

function MentorRoute({ children }) {
  const { isAdmin, isMentor, roleLabel, roleLoading } = usePermissions();
  if (roleLoading) return <div className="loading-spinner" />;
  if (!isAdmin && !isMentor) {
    return <AccessDenied roleLabel={roleLabel} message="Halaman ini khusus mentor atau admin." />;
  }
  return children;
}

function PermissionRoute({ permission, children }) {
  const { can, roleLabel, roleLoading, getDeniedMessage } = usePermissions();
  if (roleLoading) return <div className="loading-spinner" />;
  if (!can(permission)) return <AccessDenied roleLabel={roleLabel} message={getDeniedMessage(permission)} />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/shared/:shareId" element={<SharedReportPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<PermissionRoute permission="dashboard:read"><DashboardPage /></PermissionRoute>} />
        <Route path="/trades" element={<PermissionRoute permission="journal:write"><TradesPage /></PermissionRoute>} />
        <Route path="/trades/new" element={<PermissionRoute permission="journal:write"><NewTradePage /></PermissionRoute>} />
        <Route path="/trades/:id" element={<PermissionRoute permission="journal:write"><TradeDetailPage /></PermissionRoute>} />
        <Route path="/analytics" element={<PermissionRoute permission="analytics:read"><AnalyticsPage /></PermissionRoute>} />
        <Route path="/portfolio" element={<PermissionRoute permission="portfolio:read"><PortfolioPage /></PermissionRoute>} />
        <Route path="/cashflow" element={<PermissionRoute permission="journal:write"><CashflowPage /></PermissionRoute>} />
        <Route path="/dividends" element={<PermissionRoute permission="journal:write"><DividendPage /></PermissionRoute>} />
        <Route path="/calculator" element={<PermissionRoute permission="journal:write"><CalculatorPage /></PermissionRoute>} />
        <Route path="/watchlist" element={<PermissionRoute permission="journal:write"><WatchlistPage /></PermissionRoute>} />
        <Route path="/notes" element={<PermissionRoute permission="journal:write"><NotesPage /></PermissionRoute>} />
        <Route path="/reports" element={<PermissionRoute permission="report:manage"><ReportsPage /></PermissionRoute>} />
        <Route path="/mentor/traders" element={<MentorRoute><MentorTradersPage /></MentorRoute>} />
        <Route path="/mentor/traders/:userId" element={<MentorRoute><MentorTraderDetailPage /></MentorRoute>} />
        <Route path="/settings" element={<PermissionRoute permission="settings:manage"><SettingsPage /></PermissionRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/workspaces" element={<AdminRoute><AdminWorkspacesPage /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
