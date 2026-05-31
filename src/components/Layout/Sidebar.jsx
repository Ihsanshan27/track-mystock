import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/constants';
import { usePermissions } from '../../context/PermissionContext';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { role } = usePermissions();

  const sections = {};
  NAV_ITEMS
    .filter(item => !item.roles || item.roles.includes(role))
    .forEach(item => {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    });

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📈</div>
          <h1>Jurnal Saham</h1>
        </div>
        <nav className="sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div className="sidebar-section-title">{section}</div>
              {items.map(item => (
                <NavLink
                  to={item.path}
                  key={item.path}
                  className={({ isActive }) =>
                    `nav-item ${isActive && (item.path === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
                  }
                  end={item.path === '/'}
                  onClick={onClose}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Jurnal Saham v1.0
          </div>
        </div>
      </aside>
      <style>{`
        .sidebar-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99;
          }
        }
      `}</style>
    </>
  );
}
