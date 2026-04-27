import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
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
import ScreenerPage from './pages/ScreenerPage';
import CategoryPage from './pages/CategoryPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
  if (!user) return <Navigate to="/login" replace />;
  return <DataProvider><Layout>{children}</Layout></DataProvider>;
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
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/trades" element={<ProtectedRoute><TradesPage /></ProtectedRoute>} />
      <Route path="/trades/new" element={<ProtectedRoute><NewTradePage /></ProtectedRoute>} />
      <Route path="/trades/:id" element={<ProtectedRoute><TradeDetailPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
      <Route path="/cashflow" element={<ProtectedRoute><CashflowPage /></ProtectedRoute>} />
      <Route path="/dividends" element={<ProtectedRoute><DividendPage /></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
      <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/screener" element={<ProtectedRoute><ScreenerPage /></ProtectedRoute>} />
      <Route path="/category" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
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
