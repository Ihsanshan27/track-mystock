import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useData } from '../../context/DataContext';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/trades': 'Daftar Transaksi',
  '/trades/new': 'Catat Transaksi',
  '/analytics': 'Analitik & Statistik',
  '/portfolio': 'Portfolio',
  '/reports': 'Reports',
  '/mentor/traders': 'Trader Share',
  '/watchlist': 'Watchlist',
  '/notes': 'Catatan Trading',
  '/portfolios': 'Dompet & Portofolio',
  '/cashflow': 'Cash Balance',
  '/dividends': 'Dividen',
  '/calculator': 'Kalkulator Saham',
  '/settings': 'Pengaturan',
  '/admin/users': 'Admin Users',
  '/admin/workspaces': 'Admin Workspaces',
  '/admin/audit-logs': 'Audit Logs',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { toasts } = useData();

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
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
