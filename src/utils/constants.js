export const STRATEGIES = [
  'Breakout',
  'Swing Trading',
  'Scalping',
  'Value Investing',
  'Momentum',
  'Mean Reversion',
  'Gap Trading',
  'BNBR (Buy Near Buy Range)',
  'Follow Trend',
  'Contrarian',
  'Lainnya',
];

export const EMOTIONS = [
  { value: 'calm', label: '😎 Tenang', emoji: '😎' },
  { value: 'confident', label: '💪 Percaya Diri', emoji: '💪' },
  { value: 'fearful', label: '😰 Takut', emoji: '😰' },
  { value: 'greedy', label: '🤑 Serakah', emoji: '🤑' },
  { value: 'revenge', label: '😤 Revenge Trading', emoji: '😤' },
  { value: 'doubtful', label: '🤔 Ragu-ragu', emoji: '🤔' },
  { value: 'fomo', label: '😱 FOMO', emoji: '😱' },
  { value: 'neutral', label: '😐 Netral', emoji: '😐' },
];

export const WATCHLIST_STATUS = [
  { value: 'waiting', label: 'Menunggu', color: 'yellow' },
  { value: 'entered', label: 'Sudah Entry', color: 'green' },
  { value: 'passed', label: 'Dilewati', color: 'red' },
];

export const WATCHLIST_PRIORITY = [
  { value: 'high', label: 'Tinggi', color: 'red' },
  { value: 'medium', label: 'Sedang', color: 'yellow' },
  { value: 'low', label: 'Rendah', color: 'blue' },
];

export const DEFAULT_BROKER_FEE = {
  buyFee: 0.15,
  sellFee: 0.25,
  ppn: 11,
};

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/trades', label: 'Transaksi', icon: '📝', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/portfolio', label: 'Portfolio', icon: '💼', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/cashflow', label: 'Cash Balance', icon: '💵', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/dividends', label: 'Dividen', icon: '💰', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/analytics', label: 'Analitik', icon: '📈', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/reports', label: 'Reports', icon: '📄', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/mentor/traders', label: 'Trader Share', icon: '🧭', section: 'MENU', roles: ['mentor', 'admin'] },
  { path: '/calculator', label: 'Kalkulator', icon: '🧮', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/watchlist', label: 'Watchlist', icon: '👀', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/notes', label: 'Catatan', icon: '📔', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/admin/users', label: 'Users', icon: '👥', section: 'ADMIN', roles: ['admin'] },
  { path: '/admin/workspaces', label: 'Workspaces', icon: '🏢', section: 'ADMIN', roles: ['admin'] },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: '🧾', section: 'ADMIN', roles: ['admin'] },
  { path: '/settings', label: 'Pengaturan', icon: '⚙️', section: 'LAINNYA', roles: ['admin', 'mentor', 'trader'] },
];
