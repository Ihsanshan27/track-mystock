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
  { path: '/', label: 'nav.dashboard', icon: 'LayoutDashboard', section: 'section.menu', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/wealth', label: 'nav.wealth', icon: 'PieChart', section: 'section.menu', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/trades', label: 'nav.trades', icon: 'Receipt', section: 'section.menu', roles: ['admin', 'mentor', 'trader'] },
  { path: '/portfolio', label: 'nav.portfolio', icon: 'Briefcase', section: 'section.menu', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/history', label: 'nav.history', icon: 'History', section: 'section.menu', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/cashflow', label: 'nav.cashflow', icon: 'Wallet', section: 'section.menu', roles: ['admin', 'mentor', 'trader'] },
  { path: '/finance', label: 'nav.finance', icon: 'Landmark', section: 'section.menu', roles: ['admin', 'mentor', 'trader'] },
  { path: '/dividends', label: 'nav.dividends', icon: 'Coins', section: 'section.menu', roles: ['admin', 'mentor', 'trader'] },
  { path: '/analytics', label: 'nav.analytics', icon: 'LineChart', section: 'section.menu', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/reports', label: 'nav.reports', icon: 'FileText', section: 'section.menu', roles: ['admin', 'mentor', 'trader'] },
  // [MENTOR DISABLED] { path: '/mentor/traders', label: 'Trader Share', icon: 'Compass', section: 'MENU', roles: ['mentor', 'admin'] },
  { path: '/portfolios', label: 'nav.portfolios', icon: 'Wallet', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/ipo', label: 'nav.ipo', icon: 'Rocket', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/ipo/accounts', label: 'nav.ipoAccounts', icon: 'Users', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/bsjp-recap', label: 'nav.bsjp', icon: 'ClipboardList', section: 'section.tools', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/notes', label: 'nav.notes', icon: 'FileText', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/calculator', label: 'nav.calculator', icon: 'Calculator', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/watchlist', label: 'nav.watchlist', icon: 'Eye', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/plans', label: 'nav.plans', icon: 'BookOpen', section: 'section.tools', roles: ['admin', 'mentor', 'trader'] },
  { path: '/admin', label: 'nav.dashboard', icon: 'LayoutDashboard', section: 'section.admin', roles: ['admin'] },
  { path: '/admin/users', label: 'nav.users', icon: 'Users', section: 'section.admin', roles: ['admin'] },
  // { path: '/admin/workspaces', label: 'Workspaces', icon: 'Building', section: 'ADMIN', roles: ['admin'] },
  { path: '/admin/audit-logs', label: 'nav.auditLogs', icon: 'History', section: 'section.admin', roles: ['admin'] },
  { path: '/profile', label: 'nav.profile', icon: 'User', section: 'section.other', roles: ['admin', 'mentor', 'trader', 'viewer'] },
  { path: '/settings', label: 'nav.settings', icon: 'Settings', section: 'section.other', roles: ['admin', 'mentor', 'trader'] },
];
