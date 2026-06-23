import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import { useData } from '@/modules/shared/context/DataContext';
import * as Icons from 'lucide-react';
import { useTheme } from '@/modules/shared/context/ThemeContext';
import { calculatePortfolioAssetIdrEquivalent, calculatePortfolioAssetMetrics } from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';

export default function Header({ pageTitle, onMenuToggle }) {
  const { user, logout } = useAuth();
  const { profile, role, roleLabel, roleError } = usePermissions();
  useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const { portfolios, activePortfolioId: activePortId, selectPortfolio, allTrades, allCashflows, allDividends, settings } = useData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const menuRef = useRef(null);
  const portfolioMenuRef = useRef(null);
  const displayName = profile?.displayName || user?.username || 'User';
  const email = profile?.email || user?.email || '';
  const getPortfolioTotalAsset = (portfolioId) => {
    const portfolioTrades = allTrades.filter((item: any) => (item.portfolioId || 'default') === portfolioId);
    const portfolioCashflows = allCashflows.filter((item: any) => (item.portfolioId || 'default') === portfolioId);
    const portfolioDividends = allDividends.filter((item: any) => (item.portfolioId || 'default') === portfolioId);

    const idMetrics = calculatePortfolioAssetMetrics(
      portfolioTrades,
      portfolioCashflows,
      portfolioDividends,
      portfolioId === 'default' ? settings.initialCapital : 0,
      {},
      'ID'
    );

    const usMetrics = calculatePortfolioAssetMetrics(
      portfolioTrades,
      portfolioCashflows,
      portfolioDividends,
      portfolioId === 'default' ? (settings.initialCapitalUS ?? 1000) : 0,
      {},
      'US'
    );

    return calculatePortfolioAssetIdrEquivalent(idMetrics, usMetrics, settings.usdToIdrRate ?? 16200);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
      if (!portfolioMenuRef.current?.contains(event.target)) {
        setPortfolioOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          type="button"
          aria-label="Buka menu navigasi"
        >
          <Icons.Menu size={20} />
        </button>
        <h2 className="header-title">{pageTitle}</h2>
      </div>
      <div className="header-right">
        {/* Custom Portfolio Dropdown */}
        <div className="portfolio-switcher-wrap" ref={portfolioMenuRef}>
          <button
            type="button"
            className="portfolio-switcher-btn"
            onClick={() => setPortfolioOpen(o => !o)}
            title="Pilih portofolio aktif"
          >
            <div className="portfolio-switcher-top">
              <Icons.Wallet size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span className="portfolio-switcher-label">Portofolio</span>
            </div>
            <div className="portfolio-switcher-bottom">
              <span className="portfolio-switcher-name">
                {portfolios.find(p => p.id === activePortId)?.name || 'Utama'}
              </span>
              <span className="portfolio-switcher-bp">
                {formatRupiah(getPortfolioTotalAsset(activePortId))}
              </span>
              <Icons.ChevronDown size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0, transition: 'transform 0.2s', transform: portfolioOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
          </button>

          {portfolioOpen && (
            <div className="portfolio-dropdown">
              {portfolios.map(p => {
                const isActive = p.id === activePortId;
                const totalAsset = getPortfolioTotalAsset(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`portfolio-dropdown-item ${isActive ? 'active' : ''}`}
                    onClick={() => { selectPortfolio(p.id); setPortfolioOpen(false); }}
                  >
                    <div className="portfolio-dropdown-name">
                      {isActive && <Icons.Check size={12} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />}
                      <span>{p.name}</span>
                    </div>
                    <div className="portfolio-dropdown-bp">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginRight: 4 }}>Total Asset</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{formatRupiah(totalAsset)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span
          className={`role-badge role-badge-${role}`}
          title={roleError ? `Role fallback: ${roleError}` : `Role: ${roleLabel}`}
        >
          {roleLabel}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
        </button>

        <div className="profile-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="header-user"
            onClick={() => setProfileOpen(open => !open)}
            title="Buka profil"
          >
            <div className="header-avatar">
              {displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="header-user-name">
              {displayName}
            </span>
            <Icons.ChevronDown size={14} className="profile-chevron" style={{ color: 'var(--text-muted)', marginLeft: '2px' }} />
          </button>

          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-head">
                <div className="header-avatar">
                  {displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="profile-menu-name">{displayName}</div>
                  <div className="profile-menu-email">{email || 'Tanpa email'}</div>
                </div>
              </div>
              <div className="profile-menu-meta">
                <span className={`role-badge role-badge-${role}`}>{roleLabel}</span>
              </div>
              <div className="profile-menu-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Link className="btn btn-secondary btn-sm" style={{ flex: '1 1 auto', padding: '6px 10px' }} to="/profile" onClick={() => setProfileOpen(false)}>
                  Profil
                </Link>
                <Link className="btn btn-secondary btn-sm" style={{ flex: '1 1 auto', padding: '6px 10px' }} to="/settings" onClick={() => setProfileOpen(false)}>
                  Pengaturan
                </Link>
                <button className="btn btn-danger btn-sm" style={{ flex: '1 1 100%', padding: '6px 10px' }} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .profile-menu-wrap {
          position: relative;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          flex: 1 1 auto;
        }
        /* Portfolio custom dropdown */
        .portfolio-switcher-wrap {
          position: relative;
          flex: 0 1 auto;
          min-width: 0;
        }
        .portfolio-switcher-btn {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 6px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          cursor: pointer;
          text-align: left;
          min-width: 180px;
          max-width: min(260px, 34vw);
          transition: border-color 0.15s;
        }
        .portfolio-switcher-btn:hover {
          border-color: var(--accent-green);
        }
        .portfolio-switcher-top {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .portfolio-switcher-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .portfolio-switcher-bottom {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .portfolio-switcher-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }
        .portfolio-switcher-bp {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--accent-green);
          font-family: var(--font-mono, monospace);
          white-space: nowrap;
        }
        .portfolio-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 240px;
          max-height: 258px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 300;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .portfolio-dropdown-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          width: 100%;
        }
        .portfolio-dropdown-item:hover {
          background: var(--bg-hover);
        }
        .portfolio-dropdown-item.active {
          background: var(--accent-green-dim);
          border-color: rgba(16,185,129,0.25);
        }
        .portfolio-dropdown-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.87rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .portfolio-dropdown-bp {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-family: var(--font-mono, monospace);
        }
        .profile-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 280px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 14px;
          z-index: 250;
        }
        .profile-menu-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }
        .profile-menu-name {
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-menu-email {
          color: var(--text-muted);
          font-size: 0.78rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-menu-meta {
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .profile-menu-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 12px;
        }
        .header-user-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 110px;
        }
        .header-user {
          border: 1px solid var(--border-color);
        }
        .role-badge {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-secondary);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .role-badge-admin {
          color: var(--accent-red-light);
          background: var(--accent-red-dim);
        }
        .role-badge-mentor {
          color: var(--accent-purple);
          background: var(--accent-purple-dim);
        }
        .role-badge-trader {
          color: var(--accent-green);
          background: var(--accent-green-dim);
        }
        .role-badge-viewer {
          color: var(--accent-blue-light);
          background: var(--accent-blue-dim);
        }
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .header-left {
            gap: 10px;
          }
          .portfolio-switcher-btn {
            min-width: 140px;
            max-width: 42vw;
            padding: 6px 10px;
          }
          .portfolio-switcher-name {
            max-width: 72px;
          }
          .portfolio-switcher-bp {
            font-size: 0.72rem;
          }
          .workspace-switcher {
            flex: 1;
            min-width: 0;
          }
          .workspace-switcher-select {
            min-width: 0;
            width: 100%;
          }
          .header-right > .role-badge {
            display: none;
          }
          .header-user-name,
          .profile-chevron {
            display: none;
          }
          .profile-menu .role-badge {
            display: inline-flex;
          }
          .profile-menu {
            right: -8px;
            width: min(280px, calc(100vw - 24px));
          }
        }
        @media (max-width: 560px) {
          .portfolio-switcher-wrap {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
