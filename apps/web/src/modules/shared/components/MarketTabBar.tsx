/**
 * Reusable tab switcher for Indonesia / America market toggle.
 *
 * Usage:
 *   <MarketTabBar activeTab={activeTab} onChange={setActiveTab} />
 */
export interface MarketTabBarProps {
  activeTab: 'ID' | 'US' | 'ALL';
  onChange: (tab: 'ID' | 'US' | 'ALL') => void;
  /** Accent color for active tab underline. Defaults to var(--accent-green) */
  accentColor?: string;
  showAll?: boolean;
}

export default function MarketTabBar({ activeTab, onChange, accentColor = 'var(--accent-green)', showAll = false }: MarketTabBarProps) {
  const baseStyle: React.CSSProperties = {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    fontSize: '0.9rem',
  };

  const tabs = showAll ? (['ID', 'US', 'ALL'] as const) : (['ID', 'US'] as const);

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          style={{
            ...baseStyle,
            borderBottom: activeTab === tab ? `2px solid ${accentColor}` : '2px solid transparent',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
          onClick={() => onChange(tab)}
        >
          {tab === 'ID' ? 'Pasar Indonesia' : tab === 'US' ? 'Pasar Amerika' : 'Semua Pasar'}
        </button>
      ))}
    </div>
  );
}
