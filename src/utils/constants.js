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
  buyFee: 0.15,   // 0.15%
  sellFee: 0.25,  // 0.25% (includes PPh)
  ppn: 11,        // 11% PPN dari komisi
};

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊', section: 'MENU' },
  { path: '/trades', label: 'Transaksi', icon: '📝', section: 'MENU' },
  { path: '/portfolio', label: 'Portfolio', icon: '💼', section: 'MENU' },
  { path: '/cashflow', label: 'Cash Balance', icon: '💵', section: 'MENU' },
  { path: '/dividends', label: 'Dividen', icon: '💰', section: 'MENU' },
  { path: '/analytics', label: 'Analitik', icon: '📈', section: 'MENU' },
  { path: '/calculator', label: 'Kalkulator', icon: '🧮', section: 'TOOLS' },
  { path: '/watchlist', label: 'Watchlist', icon: '👀', section: 'TOOLS' },
  { path: '/screener', label: 'Screener', icon: '🔍', section: 'TOOLS' },
  { path: '/category', label: 'Per Komoditas', icon: '🏭', section: 'TOOLS' },
  { path: '/notes', label: 'Catatan', icon: '📔', section: 'TOOLS' },
  { path: '/settings', label: 'Pengaturan', icon: '⚙️', section: 'LAINNYA' },
];
