export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isDefault?: boolean;
}

export interface Trade {
  id: string;
  market: 'ID' | 'US';
  stockCode: string;
  dateBuy: string;
  dateSell?: string | null;
  buyPrice: number;
  sellPrice?: number | null;
  lots: number;
  buyFee: number;
  sellFee: number;
  strategy?: string;
  reasonEntry?: string;
  reasonExit?: string;
  emotion?: string;
  rating?: number;
  tags?: string[];
  notes?: string;
  portfolioId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cashflow {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  notes?: string;
  portfolioId?: string;
  createdAt?: string;
}

export interface Dividend {
  id: string;
  stockCode: string;
  amountPerShare: number;
  lots: number;
  totalAmount: number;
  dateReceived: string;
  portfolioId?: string;
  createdAt?: string;
}

export interface WatchlistItem {
  id: string;
  stockCode: string;
  targetPrice?: number | null;
  reason?: string;
  status: 'waiting' | 'entered' | 'passed';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export interface AppSettings {
  initialCapital: number;
  monthlyTarget: number;
  defaultBuyFee: number;
  defaultSellFee: number;
  initialCapitalUS: number;
  defaultBuyFeeUS: number;
  defaultSellFeeUS: number;
}
