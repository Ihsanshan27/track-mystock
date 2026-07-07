import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/modules/shared/utils/constants';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import * as Icons from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { role } = usePermissions();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sections: Record<string, typeof NAV_ITEMS> = {};
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
          <div className="sidebar-logo-icon">
            <Icons.TrendingUp size={18} strokeWidth={2.5} style={{ color: '#ffffff' }} />
          </div>
          <h1>Jurnal Saham</h1>
        </div>
        <nav className="sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div className="sidebar-section-title">{section}</div>
              {items.map(item => {
                const IconComponent = (Icons as any)[item.icon];
                return (
                  <NavLink
                    to={item.path}
                    key={item.path}
                    className={({ isActive }) =>
                      `nav-item ${isActive && (item.path === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
                    }
                    end={item.path === '/'}
                    onClick={onClose}
                  >
                    <span className="nav-item-icon">
                      {IconComponent && <IconComponent size={18} strokeWidth={2} />}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Jurnal Saham v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
