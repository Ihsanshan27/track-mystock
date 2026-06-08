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
  { value: 'calm', label: 'Tenang', icon: 'Smile' },
  { value: 'confident', label: 'Percaya Diri', icon: 'Award' },
  { value: 'fearful', label: 'Takut', icon: 'AlertTriangle' },
  { value: 'greedy', label: 'Serakah', icon: 'TrendingUp' },
  { value: 'revenge', label: 'Revenge Trading', icon: 'Flame' },
  { value: 'doubtful', label: 'Ragu-ragu', icon: 'HelpCircle' },
  { value: 'fomo', label: 'FOMO', icon: 'Zap' },
  { value: 'neutral', label: 'Netral', icon: 'Minus' },
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
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/trades', label: 'Transaksi', icon: 'Receipt', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/portfolio', label: 'Portfolio', icon: 'Briefcase', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/cashflow', label: 'Cash Balance', icon: 'Wallet', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/dividends', label: 'Dividen', icon: 'Coins', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  { path: '/analytics', label: 'Analitik', icon: 'LineChart', section: 'MENU', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/reports', label: 'Reports', icon: 'FileText', section: 'MENU', roles: ['admin', 'mentor', 'trader'] },
  // [MENTOR DISABLED] { path: '/mentor/traders', label: 'Trader Share', icon: 'Compass', section: 'MENU', roles: ['mentor', 'admin'] },
  { path: '/calculator', label: 'Kalkulator', icon: 'Calculator', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/watchlist', label: 'Watchlist', icon: 'Eye', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/notes', label: 'Catatan', icon: 'FileText', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/portfolios', label: 'Dompet', icon: 'Wallet', section: 'TOOLS', roles: ['admin', 'mentor', 'trader'] },
  { path: '/admin/users', label: 'Users', icon: 'Users', section: 'ADMIN', roles: ['admin'] },
  // { path: '/admin/workspaces', label: 'Workspaces', icon: 'Building', section: 'ADMIN', roles: ['admin'] },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'History', section: 'ADMIN', roles: ['admin'] },
  { path: '/settings', label: 'Pengaturan', icon: 'Settings', section: 'LAINNYA', roles: ['admin', 'mentor', 'trader'] },
];
