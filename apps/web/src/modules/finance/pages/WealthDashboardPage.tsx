import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatPercent } from '@/modules/shared/utils/formatters';
import { calculatePortfolioBalance, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import WealthCharts from '@/modules/finance/components/WealthCharts';
import { PieChart, Landmark, WalletCards, Briefcase } from 'lucide-react';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import '@/modules/finance/finance.css';

export default function WealthDashboardPage() {
  const {
    financeAccounts,
    portfolios,
    defaultPortfolioId,
    allTrades,
    allCashflows,
    allDividends,
    marketPrices,
    settings,
    getFinanceAccountCurrentBalance,
  } = useData();

  const blurStyle = usePrivacyStyle();

  // State for toggling bank accounts in the calculation
  const [activeBanks, setActiveBanks] = useState<Record<string, boolean>>({});
  
  // State for filtering trades by portfolio
  const [activePortfolioTab, setActivePortfolioTab] = useState<string>('ALL'); // 'ALL' or portfolio.id

  // Initialize activeBanks
  useEffect(() => {
    const initialBanks: Record<string, boolean> = {};
    financeAccounts.forEach((acc: any) => {
      if (acc.isActive) {
        initialBanks[acc.id] = true;
      }
    });
    // Only set if we haven't initialized yet to preserve user toggles during re-renders
    setActiveBanks(prev => Object.keys(prev).length === 0 ? initialBanks : prev);
  }, [financeAccounts]);

  const toggleBank = (id: string) => {
    setActiveBanks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // --- CALCULATION LOGIC ---

  // 1. Bank Balances
  const bankAccountsWithBalance = useMemo(() => {
    return financeAccounts.map((account: any) => ({
      ...account,
      currentBalance: getFinanceAccountCurrentBalance(account.id),
    }));
  }, [financeAccounts, getFinanceAccountCurrentBalance]);

  const totalBankBalance = useMemo(() => {
    return bankAccountsWithBalance
      .filter((acc: any) => activeBanks[acc.id])
      .reduce((sum, acc: any) => sum + acc.currentBalance, 0);
  }, [bankAccountsWithBalance, activeBanks]);

  // 2. Trading Equity (from all wallets)
  const portfoliosWithStats = useMemo(() => {
    return portfolios.map((portfolio: any) => {
      const portfolioTrades = allTrades.filter((trade: any) => (trade.portfolioId || defaultPortfolioId) === portfolio.id);
      const portfolioCashflows = allCashflows.filter((cashflow: any) => (cashflow.portfolioId || defaultPortfolioId) === portfolio.id);
      const portfolioDividends = allDividends.filter((dividend: any) => (dividend.portfolioId || defaultPortfolioId) === portfolio.id);
      const initialCapID = portfolio.id === defaultPortfolioId ? (settings.initialCapital ?? 10000000) : 0;
      const initialCapUS = portfolio.id === defaultPortfolioId ? (settings.initialCapitalUS ?? 1000) : 0;

      const statsID = calculatePortfolioBalance(
        portfolioTrades.filter((t: any) => t.market !== 'US'),
        portfolioCashflows.filter((c: any) => c.market !== 'US'),
        portfolioDividends.filter((d: any) => d.market !== 'US'),
        initialCapID,
      );

      const statsUS = calculatePortfolioBalance(
        portfolioTrades.filter((t: any) => t.market === 'US'),
        portfolioCashflows.filter((c: any) => c.market === 'US'),
        portfolioDividends.filter((d: any) => d.market === 'US'),
        initialCapUS,
      );

      const openTrades = portfolioTrades.filter((t: any) => !t.sellPrice || !t.dateSell);
      let openValueID = 0;
      let openValueUS = 0;

      openTrades.forEach((trade: any) => {
        const isUS = trade.market === 'US';
        const shares = isUS ? trade.lots : trade.lots * 100;
        const currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.sellPrice || 0;

        let positionValue = trade.buyPrice * shares;
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
          positionValue = (trade.buyPrice * shares) + unrealized.pnl;
        }

        if (isUS) {
          openValueUS += positionValue;
        } else {
          openValueID += positionValue;
        }
      });

      const usdToIdrRate = settings.usdToIdrRate ?? 16200;
      const totalIDR = statsID.buyingPower + openValueID;
      const totalUSDInIDR = (statsUS.buyingPower + openValueUS) * usdToIdrRate;
      
      return {
        ...portfolio,
        totalEquity: totalIDR + totalUSDInIDR,
        cashIDR: statsID.buyingPower,
        cashUSD: statsUS.buyingPower,
        investedIDR: openValueID,
        investedUSD: openValueUS,
      };
    });
  }, [portfolios, defaultPortfolioId, allTrades, allCashflows, allDividends, marketPrices, settings]);

  const totalTradingEquity = useMemo(() => {
    return portfoliosWithStats.reduce((sum, p) => sum + p.totalEquity, 0);
  }, [portfoliosWithStats]);

  const totalNetWorth = totalBankBalance + totalTradingEquity;

  // --- CHART DATA GENERATION ---

  const walletEquityData = useMemo(() => {
    return portfoliosWithStats.map(p => ({
      name: p.name,
      value: p.totalEquity
    })).filter(d => d.value > 0);
  }, [portfoliosWithStats]);

  const cashVsInvestData = useMemo(() => {
    const totalCash = totalBankBalance + portfoliosWithStats.reduce((sum, p) => sum + p.cashIDR + (p.cashUSD * (settings.usdToIdrRate ?? 16200)), 0);
    const totalInvested = portfoliosWithStats.reduce((sum, p) => sum + p.investedIDR + (p.investedUSD * (settings.usdToIdrRate ?? 16200)), 0);
    
    return [
      { name: 'Uang Kas (Bank + Buying Power)', value: totalCash },
      { name: 'Investasi Saham/Reksadana', value: totalInvested }
    ];
  }, [totalBankBalance, portfoliosWithStats, settings]);

  const currencyData = useMemo(() => {
    const usdToIdrRate = settings.usdToIdrRate ?? 16200;
    const totalIDR = totalBankBalance + portfoliosWithStats.reduce((sum, p) => sum + p.cashIDR + p.investedIDR, 0);
    const totalUSD = portfoliosWithStats.reduce((sum, p) => sum + (p.cashUSD + p.investedUSD) * usdToIdrRate, 0);
    
    return [
      { name: 'Total Aset', IDR: totalIDR, USD: totalUSD }
    ];
  }, [totalBankBalance, portfoliosWithStats, settings]);

  // --- COMBINED POSITIONS TABLE ---
  
  const openPositions = useMemo(() => {
    return allTrades
      .filter((t: any) => !t.sellPrice || !t.dateSell)
      .map(trade => {
        const portfolio = portfolios.find((p: any) => p.id === (trade.portfolioId || defaultPortfolioId));
        const isUS = trade.market === 'US';
        const shares = trade.assetType === 'mutual_fund' ? trade.lots : (isUS ? trade.lots : trade.lots * 100);
        const currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.buyPrice;
        const totalValue = currentPrice * shares;
        const { pnl, pnlPercent } = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
        
        return {
          ...trade,
          portfolioName: portfolio?.name || 'Unknown',
          currentPrice,
          totalValue,
          pnl,
          pnlPercent,
          shares
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [allTrades, portfolios, defaultPortfolioId, marketPrices]);

  const filteredPositions = useMemo(() => {
    if (activePortfolioTab === 'ALL') return openPositions;
    return openPositions.filter(p => (p.portfolioId || defaultPortfolioId) === activePortfolioTab);
  }, [openPositions, activePortfolioTab, defaultPortfolioId]);

  return (
    <div className="wealth-dashboard-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <PieChart size={28} />
          </div>
          <div>
            <h1 className="page-title">Kekayaan (Wealth Dashboard)</h1>
            <p className="page-subtitle">Pantau seluruh total kekayaan Anda (Net Worth) di satu tempat secara real-time.</p>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Landmark size={16} /> Total Net Worth
          </div>
          <div className="stat-card-value text-profit" style={{ ...blurStyle, fontSize: '2rem' }}>
            {formatRupiah(totalNetWorth)}
          </div>
          <div className="finance-summary-note">Gabungan kas dan investasi Anda</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={16} /> Total Trading Equity
          </div>
          <div className="stat-card-value" style={blurStyle}>
            {formatRupiah(totalTradingEquity)}
          </div>
          <div className="finance-summary-note">Total dana di {portfolios.length} dompet trading</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WalletCards size={16} /> Total Kas Rekening
          </div>
          <div className="stat-card-value" style={blurStyle}>
            {formatRupiah(totalBankBalance)}
          </div>
          <div className="finance-summary-note">Saldo bank & e-wallet yang aktif dihitung</div>
        </div>
      </div>

      {/* CHARTS */}
      <WealthCharts 
        walletEquityData={walletEquityData} 
        cashVsInvestData={cashVsInvestData}
        currencyData={currencyData}
      />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* BANK ACCOUNTS TABLE */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Rekening Bank & E-Wallet</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {bankAccountsWithBalance.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada rekening tercatat.</div>
            ) : (
              <div className="table-container" style={{ margin: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>Aktif</th>
                      <th>Nama Rekening</th>
                      <th>Institusi</th>
                      <th style={{ textAlign: 'right' }}>Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccountsWithBalance.map((acc: any) => (
                      <tr key={acc.id} style={{ opacity: activeBanks[acc.id] ? 1 : 0.5 }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={!!activeBanks[acc.id]} 
                            onChange={() => toggleBank(acc.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{acc.name}</td>
                        <td className="text-secondary">{acc.institutionName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className={acc.currentBalance >= 0 ? 'text-profit' : 'text-loss'}>
                          <span style={blurStyle}>{formatRupiah(acc.currentBalance)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* COMBINED POSITIONS TABLE */}
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
            <h3 className="card-title">Posisi Trading Gabungan</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', width: '100%', paddingBottom: 4 }}>
              <button 
                className={`btn btn-sm ${activePortfolioTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePortfolioTab('ALL')}
              >
                Semua Dompet
              </button>
              {portfolios.map((p: any) => (
                <button 
                  key={p.id}
                  className={`btn btn-sm ${activePortfolioTab === p.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActivePortfolioTab(p.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredPositions.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada posisi terbuka untuk filter ini.</div>
            ) : (
              <div className="table-container" style={{ margin: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode/Produk</th>
                      <th>Dompet</th>
                      <th style={{ textAlign: 'right' }}>Unit/Lot</th>
                      <th style={{ textAlign: 'right' }}>Unrealized P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((p: any) => {
                      const isProfit = p.pnl >= 0;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.stockCode}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.assetType === 'mutual_fund' ? 'Reksadana' : p.market === 'US' ? 'Saham US' : 'Saham ID'}</div>
                          </td>
                          <td className="text-secondary" style={{ fontSize: '0.85rem' }}>{p.portfolioName}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div>{p.lots} {p.assetType === 'mutual_fund' ? 'unit' : p.market === 'US' ? 'shares' : 'lot'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><span style={blurStyle}>{formatRupiah(p.totalValue)}</span></div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className={isProfit ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                              <span style={blurStyle}>{isProfit ? '+' : ''}{p.market === 'US' ? formatRupiah(p.pnl * (settings.usdToIdrRate ?? 16200)) : formatRupiah(p.pnl)}</span>
                            </div>
                            <div className={isProfit ? 'text-profit' : 'text-loss'} style={{ fontSize: '0.75rem' }}>
                              ({isProfit ? '+' : ''}{formatPercent(p.pnlPercent)})
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
