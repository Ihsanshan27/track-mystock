import type { SortConfig } from '@/modules/shared/hooks/useTableSort';
import type { Trade } from '@/modules/shared/types/index';

export type DashboardRecentTradeSortKey =
  | 'stockCode'
  | 'dateSell'
  | 'buyPrice'
  | 'sellPrice'
  | 'lots'
  | 'pnl'
  | 'pnlPercent';

export type TradePerformance = {
  totalBuy: number;
  totalSell: number;
  buyCommission: number;
  sellCommission: number;
  totalFee: number;
  pnl: number;
  pnlPercent: number;
  shares: number;
};

export type ClosedDashboardTrade = Trade &
  TradePerformance & {
    sellPrice: number;
    dateSell: string;
    sellDateObj: Date;
  };

export type DashboardInsightItem = {
  id: string;
  title: string;
  tone: string;
  category: string;
  metricKind: string;
  metricValue: number;
  metricLabel: string;
  summary: string;
};

export type DashboardAchievement = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  unlocked: boolean;
};

export type PerformanceChartPoint = {
  date: string;
  label: string;
  portfolioReturn: number;
  ihsgReturn: number | null;
};

export type ProfitLossChartPoint = {
  key: string;
  label: string;
  pnl: number;
  tradeCount: number;
};

export type DashboardCalendarDay = {
  day: number;
  date: string;
  pnl: number;
};

export type RangeSummaryItem<K extends string> = {
  key: K;
  label: string;
  count: number;
  realized: number;
  invested: number;
  winRate: number;
};

export type DashboardRecentTradesTableProps = {
  formatDate: (value: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  formatPercent: (value: number) => string;
  recentSortConfig: SortConfig<DashboardRecentTradeSortKey>;
  requestRecentSort: (key: DashboardRecentTradeSortKey) => void;
  sortedRecentTrades: ClosedDashboardTrade[];
};

export type IhsgQuote = {
  price?: number | null;
  changePct?: number | null;
};

export type IhsgCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type IhsgMetrics = {
  last: number;
  first: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
};
