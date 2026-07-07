import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/modules/auth/AuthContext';
import { DataProvider, useData } from '@/modules/shared/context/DataContext';
import { PermissionProvider, usePermissions } from '@/modules/shared/context/PermissionContext';
import { WorkspaceProvider, useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import Layout from '@/modules/shared/components/Layout';
import { ThemeProvider } from '@/modules/shared/context/ThemeContext';
import { DialogProvider } from '@/modules/shared/context/DialogContext';

import DatabaseSetupNotice from '@/modules/shared/components/DatabaseSetupNotice';
import AccessDenied from '@/modules/shared/components/AccessDenied';
import StateMessage from '@/modules/shared/components/StateMessage';

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/modules/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/modules/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/modules/auth/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const TradesPage = lazy(() => import('@/modules/trades/pages/TradesPage'));
const NewTradePage = lazy(() => import('@/modules/trades/pages/NewTradePage'));
const TradeDetailPage = lazy(() => import('@/modules/trades/pages/TradeDetailPage'));
const AnalyticsPage = lazy(() => import('@/modules/analytics/pages/AnalyticsPage'));
const HistoryPage = lazy(() => import('@/modules/history/pages/HistoryPage'));
const PortfolioPage = lazy(() => import('@/modules/portfolios/pages/PortfolioPage'));
const CalculatorPage = lazy(() => import('@/modules/calculator/pages/CalculatorPage'));
const WatchlistPage = lazy(() => import('@/modules/watchlist/pages/WatchlistPage'));
const NotesPage = lazy(() => import('@/modules/notes/pages/NotesPage'));
const PortfoliosPage = lazy(() => import('@/modules/portfolios/pages/PortfoliosPage'));
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/modules/profile/pages/ProfilePage'));
const BsjpRecapPage = lazy(() => import('./modules/trades/pages/BsjpRecapPage'));
const TradingPlansPage = lazy(() => import('@/modules/plans/pages/TradingPlansPage'));
const CashflowPage = lazy(() => import('@/modules/cashflow/pages/CashflowPage'));
const DividendPage = lazy(() => import('@/modules/dividends/pages/DividendPage'));
const FinancePage = lazy(() => import('@/modules/finance/pages/FinancePage'));
const FinanceAccountDetailPage = lazy(() => import('@/modules/finance/pages/FinanceAccountDetailPage'));
const IpoListPage = lazy(() => import('@/modules/ipo/pages/IpoListPage'));
const IpoDetailPage = lazy(() => import('@/modules/ipo/pages/IpoDetailPage'));
const IpoSummaryPage = lazy(() => import('@/modules/ipo/pages/IpoSummaryPage'));
const IpoAccountsPage = lazy(() => import('@/modules/ipo/pages/IpoAccountsPage'));
const AdminUsersPage = lazy(() => import('@/modules/admin/pages/AdminUsersPage'));
const AdminWorkspacesPage = lazy(() => import('@/modules/admin/pages/AdminWorkspacesPage'));
const AdminAuditLogsPage = lazy(() => import('@/modules/admin/pages/AdminAuditLogsPage'));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'));
const SharedReportPage = lazy(() => import('@/modules/reports/pages/SharedReportPage'));
// [MENTOR DISABLED] const MentorTradersPage = lazy(() => import('@/modules/mentor/pages/MentorTradersPage'));
// [MENTOR DISABLED] const MentorTraderDetailPage = lazy(() => import('@/modules/mentor/pages/MentorTraderDetailPage'));

function RouteLoader() {
  return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
}

function LazyPage({ children }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoader />;
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
  if (loading) return <RouteLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LazyPage><LoginPage /></LazyPage></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><LazyPage><RegisterPage /></LazyPage></PublicRoute>} />
      <Route path="/verify-email" element={<PublicRoute><LazyPage><VerifyEmailPage /></LazyPage></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><LazyPage><ForgotPasswordPage /></LazyPage></PublicRoute>} />
      <Route path="/reset-password" element={<LazyPage><ResetPasswordPage /></LazyPage>} />
      <Route path="/shared/:shareId" element={<LazyPage><SharedReportPage /></LazyPage>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<PermissionRoute permission="dashboard:read"><LazyPage><DashboardPage /></LazyPage></PermissionRoute>} />
        <Route path="/trades" element={<PermissionRoute permission="journal:write"><LazyPage><TradesPage /></LazyPage></PermissionRoute>} />
        <Route path="/bsjp-recap" element={<PermissionRoute permission="dashboard:read"><LazyPage><BsjpRecapPage /></LazyPage></PermissionRoute>} />
        <Route path="/trades/new" element={<PermissionRoute permission="journal:write"><LazyPage><NewTradePage /></LazyPage></PermissionRoute>} />
        <Route path="/trades/:id" element={<PermissionRoute permission="journal:write"><LazyPage><TradeDetailPage /></LazyPage></PermissionRoute>} />
        <Route path="/analytics" element={<PermissionRoute permission="analytics:read"><LazyPage><AnalyticsPage /></LazyPage></PermissionRoute>} />
        <Route path="/history" element={<PermissionRoute permission="portfolio:read"><LazyPage><HistoryPage /></LazyPage></PermissionRoute>} />
        <Route path="/portfolio" element={<PermissionRoute permission="portfolio:read"><LazyPage><PortfolioPage /></LazyPage></PermissionRoute>} />
        <Route path="/cashflow" element={<PermissionRoute permission="journal:write"><LazyPage><CashflowPage /></LazyPage></PermissionRoute>} />
        <Route path="/finance" element={<PermissionRoute permission="journal:write"><LazyPage><FinancePage /></LazyPage></PermissionRoute>} />
        <Route path="/finance/:id" element={<PermissionRoute permission="journal:write"><LazyPage><FinanceAccountDetailPage /></LazyPage></PermissionRoute>} />
        <Route path="/dividends" element={<PermissionRoute permission="journal:write"><LazyPage><DividendPage /></LazyPage></PermissionRoute>} />
        <Route path="/calculator" element={<PermissionRoute permission="journal:write"><LazyPage><CalculatorPage /></LazyPage></PermissionRoute>} />
        <Route path="/watchlist" element={<PermissionRoute permission="journal:write"><LazyPage><WatchlistPage /></LazyPage></PermissionRoute>} />
        <Route path="/notes" element={<PermissionRoute permission="journal:write"><LazyPage><NotesPage /></LazyPage></PermissionRoute>} />
        <Route path="/portfolios" element={<PermissionRoute permission="journal:write"><LazyPage><PortfoliosPage /></LazyPage></PermissionRoute>} />
        <Route path="/reports" element={<PermissionRoute permission="report:manage"><LazyPage><ReportsPage /></LazyPage></PermissionRoute>} />
        {/* [MENTOR DISABLED]
        <Route path="/mentor/traders" element={<MentorRoute><MentorTradersPage /></MentorRoute>} />
        <Route path="/mentor/traders/:userId" element={<MentorRoute><MentorTraderDetailPage /></MentorRoute>} />
        */}
        <Route path="/settings" element={<PermissionRoute permission="settings:manage"><LazyPage><SettingsPage /></LazyPage></PermissionRoute>} />
        <Route path="/profile" element={<LazyPage><ProfilePage /></LazyPage>} />
        <Route path="/plans" element={<LazyPage><TradingPlansPage /></LazyPage>} />
        <Route path="/ipo" element={<LazyPage><IpoListPage /></LazyPage>} />
        <Route path="/ipo/summary" element={<LazyPage><IpoSummaryPage /></LazyPage>} />
        <Route path="/ipo/accounts" element={<LazyPage><IpoAccountsPage /></LazyPage>} />
        <Route path="/ipo/:id" element={<LazyPage><IpoDetailPage /></LazyPage>} />
        <Route path="/admin/users" element={<AdminRoute><LazyPage><AdminUsersPage /></LazyPage></AdminRoute>} />
        <Route path="/admin/workspaces" element={<AdminRoute><LazyPage><AdminWorkspacesPage /></LazyPage></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><LazyPage><AdminAuditLogsPage /></LazyPage></AdminRoute>} />
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
