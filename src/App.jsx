import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { PermissionProvider, usePermissions } from './context/PermissionContext';
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
import DatabaseSetupNotice from './components/DatabaseSetupNotice';
import AccessDenied from './components/AccessDenied';
import StateMessage from './components/StateMessage';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <PermissionProvider>
      <DataProvider>
        <Layout>
          <AppLoadingGate>
            <Outlet />
          </AppLoadingGate>
        </Layout>
      </DataProvider>
    </PermissionProvider>
  );
}

function AppLoadingGate({ children }) {
  const { dataLoading, dataError, databaseSetupError } = useData();
  const { roleLoading, roleError, roleSetupError, refreshProfile } = usePermissions();
  if (dataLoading || roleLoading) return <div className="loading-spinner" />;
  if (databaseSetupError || roleSetupError) {
    return (
      <DatabaseSetupNotice
        error={databaseSetupError || roleSetupError}
        onRetry={() => {
          refreshProfile();
          window.location.reload();
        }}
      />
    );
  }
  if (dataError || roleError) {
    return (
      <StateMessage
        tone="danger"
        title="Gagal memuat aplikasi"
        description={dataError || roleError}
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
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/trades/new" element={<NewTradePage />} />
        <Route path="/trades/:id" element={<TradeDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/cashflow" element={<CashflowPage />} />
        <Route path="/dividends" element={<DividendPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
