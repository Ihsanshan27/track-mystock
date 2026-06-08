import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function Header({ pageTitle, onMenuToggle }) {
  const { user, logout } = useAuth();
  const { profile, role, roleLabel, roleError } = usePermissions();
  const { availableWorkspaces, activeWorkspaceId, selectWorkspace, workspaceLoading } = useWorkspace();
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = profile?.displayName || user?.username || 'User';
  const email = profile?.email || user?.email || '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setProfileOpen(false);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          style={{ display: 'none' }}
        >
          ☰
        </button>
        <h2 className="header-title">{pageTitle}</h2>
      </div>
      <div className="header-right">
        <label className="workspace-switcher" title="Pilih workspace aktif">
          <span className="workspace-switcher-label">Workspace</span>
          <select
            className="workspace-switcher-select"
            value={activeWorkspaceId || ''}
            onChange={(event) => selectWorkspace(event.target.value || null)}
            disabled={workspaceLoading}
          >
            {availableWorkspaces.map((workspace) => (
              <option key={workspace.id || 'personal'} value={workspace.id || ''}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        <span
          className={`role-badge role-badge-${role}`}
          title={roleError ? `Role fallback: ${roleError}` : `Role: ${roleLabel}`}
        >
          {roleLabel}
        </span>

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
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              {displayName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>▾</span>
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
              <div className="profile-menu-actions">
                <Link className="btn btn-secondary btn-sm" to="/settings" onClick={() => setProfileOpen(false)}>
                  Pengaturan
                </Link>
                <button className="btn btn-danger btn-sm" onClick={handleLogout}>
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
        .workspace-switcher {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .workspace-switcher-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .workspace-switcher-select {
          min-width: 180px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text-primary);
          padding: 9px 12px;
          font-size: 0.85rem;
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
          .profile-menu .role-badge {
            display: inline-flex;
          }
          .profile-menu {
            right: -8px;
            width: min(280px, calc(100vw - 24px));
          }
        }
      `}</style>
    </header>
  );
}
