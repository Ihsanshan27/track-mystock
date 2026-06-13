import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/modules/shared/components/Sidebar';
import Header from '@/modules/shared/components/Header';
import { useData } from '@/modules/shared/context/DataContext';
import { useScrollRestoration } from '@/modules/shared/hooks/useScrollRestoration';
import { CheckCircle, AlertCircle } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/trades': 'Daftar Transaksi',
  '/trades/new': 'Catat Transaksi',
  '/analytics': 'Analitik & Statistik',
  '/portfolio': 'Portfolio',
  '/reports': 'Reports',
  '/mentor/traders': 'Trader Share',
  '/watchlist': 'Watchlist',
  '/plans': 'Rencana Trading',
  '/notes': 'Catatan Trading',
  '/portfolios': 'Dompet & Portofolio',
  '/cashflow': 'Cash Balance',
  '/dividends': 'Dividen',
  '/calculator': 'Kalkulator Saham',
  '/settings': 'Pengaturan',
  '/profile': 'Profil Saya',
  '/admin/users': 'Admin Users',
  '/admin/workspaces': 'Admin Workspaces',
  '/admin/audit-logs': 'Audit Logs',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { toasts } = useData();
  useScrollRestoration();

  let pageTitle = PAGE_TITLES[location.pathname] || 'Jurnal Saham';
  if (location.pathname.startsWith('/mentor/traders/')) {
    pageTitle = 'Detail Trader Share';
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header pageTitle={pageTitle} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <div className="page-container">
          {children}
        </div>
      </div>
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'success' ? (
                <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} />
              ) : (
                <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
