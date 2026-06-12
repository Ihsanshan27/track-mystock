import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/modules/auth/AuthContext';
import { DataProvider, useData } from '@/modules/shared/context/DataContext';
import { PermissionProvider, usePermissions } from '@/modules/shared/context/PermissionContext';
import { WorkspaceProvider, useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import Layout from '@/modules/shared/components/Layout';
import { ThemeProvider } from '@/modules/shared/context/ThemeContext';
import { DialogProvider } from '@/modules/shared/context/DialogContext';

import LoginPage from '@/modules/auth/pages/LoginPage';
import RegisterPage from '@/modules/auth/pages/RegisterPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import TradesPage from '@/modules/trades/pages/TradesPage';
import NewTradePage from '@/modules/trades/pages/NewTradePage';
import TradeDetailPage from '@/modules/trades/pages/TradeDetailPage';
import AnalyticsPage from '@/modules/analytics/pages/AnalyticsPage';
import PortfolioPage from '@/modules/portfolios/pages/PortfolioPage';
import CalculatorPage from '@/modules/calculator/pages/CalculatorPage';
import WatchlistPage from '@/modules/watchlist/pages/WatchlistPage';
import NotesPage from '@/modules/notes/pages/NotesPage';
import PortfoliosPage from '@/modules/portfolios/pages/PortfoliosPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage';
import ProfilePage from '@/modules/profile/pages/ProfilePage';
import BsjpRecapPage from './modules/trades/pages/BsjpRecapPage'; // bsjp recap page
import TradingPlansPage from '@/modules/plans/pages/TradingPlansPage';
import CashflowPage from '@/modules/cashflow/pages/CashflowPage';
import DividendPage from '@/modules/dividends/pages/DividendPage';
import IpoListPage from '@/modules/ipo/pages/IpoListPage';
import IpoDetailPage from '@/modules/ipo/pages/IpoDetailPage';
import IpoSummaryPage from '@/modules/ipo/pages/IpoSummaryPage';
import AdminUsersPage from '@/modules/admin/pages/AdminUsersPage';
import AdminWorkspacesPage from '@/modules/admin/pages/AdminWorkspacesPage';
import AdminAuditLogsPage from '@/modules/admin/pages/AdminAuditLogsPage';
import ReportsPage from '@/modules/reports/pages/ReportsPage';
import SharedReportPage from '@/modules/reports/pages/SharedReportPage';
// [MENTOR DISABLED] import MentorTradersPage from '@/modules/mentor/pages/MentorTradersPage';
// [MENTOR DISABLED] import MentorTraderDetailPage from '@/modules/mentor/pages/MentorTraderDetailPage';
import DatabaseSetupNotice from '@/modules/shared/components/DatabaseSetupNotice';
import AccessDenied from '@/modules/shared/components/AccessDenied';
import StateMessage from '@/modules/shared/components/StateMessage';

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

// [MENTOR DISABLED] function MentorRoute({ children }) {
//   const { isAdmin, isMentor, roleLabel, roleLoading } = usePermissions();
//   if (roleLoading) return <div className="loading-spinner" />;
//   if (!isAdmin && !isMentor) {
//     return <AccessDenied roleLabel={roleLabel} message="Halaman ini khusus mentor atau admin." />;
//   }
//   return children;
// }

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
        <Route path="/bsjp-recap" element={<PermissionRoute permission="dashboard:read"><BsjpRecapPage /></PermissionRoute>} />
        <Route path="/trades/new" element={<PermissionRoute permission="journal:write"><NewTradePage /></PermissionRoute>} />
        <Route path="/trades/:id" element={<PermissionRoute permission="journal:write"><TradeDetailPage /></PermissionRoute>} />
        <Route path="/analytics" element={<PermissionRoute permission="analytics:read"><AnalyticsPage /></PermissionRoute>} />
        <Route path="/portfolio" element={<PermissionRoute permission="portfolio:read"><PortfolioPage /></PermissionRoute>} />
        <Route path="/cashflow" element={<PermissionRoute permission="journal:write"><CashflowPage /></PermissionRoute>} />
        <Route path="/dividends" element={<PermissionRoute permission="journal:write"><DividendPage /></PermissionRoute>} />
        <Route path="/calculator" element={<PermissionRoute permission="journal:write"><CalculatorPage /></PermissionRoute>} />
        <Route path="/watchlist" element={<PermissionRoute permission="journal:write"><WatchlistPage /></PermissionRoute>} />
        <Route path="/notes" element={<PermissionRoute permission="journal:write"><NotesPage /></PermissionRoute>} />
        <Route path="/portfolios" element={<PermissionRoute permission="journal:write"><PortfoliosPage /></PermissionRoute>} />
        <Route path="/reports" element={<PermissionRoute permission="report:manage"><ReportsPage /></PermissionRoute>} />
        {/* [MENTOR DISABLED]
        <Route path="/mentor/traders" element={<MentorRoute><MentorTradersPage /></MentorRoute>} />
        <Route path="/mentor/traders/:userId" element={<MentorRoute><MentorTraderDetailPage /></MentorRoute>} />
        */}
        <Route path="/settings" element={<PermissionRoute permission="settings:manage"><SettingsPage /></PermissionRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/plans" element={<TradingPlansPage />} />
        <Route path="/ipo" element={<IpoListPage />} />
        <Route path="/ipo/summary" element={<IpoSummaryPage />} />
        <Route path="/ipo/:id" element={<IpoDetailPage />} />
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
    <ThemeProvider>
      <DialogProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </DialogProvider>
    </ThemeProvider>
  );
}
