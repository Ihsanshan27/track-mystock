import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReadOnlyNotice from '@/modules/shared/components/ReadOnlyNotice';
import TradeReviewPanel from '@/modules/trades/components/TradeReviewPanel';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { listProfilesByIds } from '@/modules/shared/services/profileService';
import { loadSharedJournalData } from '@/modules/shared/services/sharedJournalService';
import { calculateTradePnL, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatDate, formatPercent, formatUSD, formatRupiah } from '@/modules/shared/utils/formatters';

export default function MentorTraderDetailPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useData();
  const [journal, setJournal] = useState(null);
  const [traderProfile, setTraderProfile] = useState(null);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [profileRows, journalData] = await Promise.all([
          listProfilesByIds([userId]),
          loadSharedJournalData(userId),
        ]);

        if (cancelled) return;
        setTraderProfile(profileRows[0] || null);
        setJournal(journalData);
        setSelectedTradeId((prev) => prev || journalData.trades[0]?.id || '');
      } catch (error) {
        if (!cancelled) showToast(`Gagal memuat jurnal trader: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [showToast, userId]);

  const trades = journal?.trades || [];
  const selectedTrade = trades.find((trade) => trade.id === selectedTradeId) || trades[0] || null;
  const openTrades = trades.filter((trade) => !trade.sellPrice || !trade.dateSell);
  const closedTrades = trades.filter((trade) => trade.sellPrice && trade.dateSell);

  const stats = useMemo(() => {
    return {
      totalTrades: trades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      withNotes: trades.filter((trade) => trade.notes || trade.reasonEntry || trade.reasonExit).length,
    };
  }, [closedTrades, openTrades, trades]);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  if (!journal) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <div className="empty-state-title">Jurnal trader tidak bisa dimuat</div>
        <Link to="/mentor/traders" className="btn btn-primary">Kembali ke daftar trader</Link>
      </div>
    );
  }

  return (
    <div>
      <ReadOnlyNotice
        title="Mode Mentoring"
        description="Anda sedang melihat jurnal yang dibagikan trader. Data asli tetap tidak bisa Anda ubah."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">{traderProfile?.displayName || traderProfile?.email || 'Trader'}</h1>
          <p className="page-subtitle">Review transaksi dan beri feedback untuk trader ini</p>
        </div>
        <Link to="/mentor/traders" className="btn btn-secondary">← Kembali</Link>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Total Trade" value={stats.totalTrades} />
        <StatCard label="Open Position" value={stats.openTrades} />
        <StatCard label="Closed Trade" value={stats.closedTrades} />
        <StatCard label="Trade Bernotes" value={stats.withNotes} />
      </div>

      {trades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">Belum ada transaksi yang dibagikan</div>
          <div className="empty-state-desc">Trader ini belum punya data trade untuk direview.</div>
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Daftar Transaksi</h3></div>
            <div className="card-body" style={{ display: 'grid', gap: 10 }}>
              {trades.map((trade) => {
                const calc = calculateTradePnL(trade);
                const isSelected = trade.id === selectedTrade?.id;
                return (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => setSelectedTradeId(trade.id)}
                    style={{
                      textAlign: 'left',
                      border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--accent-blue-dim)' : 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{trade.stockCode}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {formatDate(trade.dateBuy)} · {trade.strategy || 'Tanpa strategi'}
                        </div>
                      </div>
                      <div className={calc.pnl >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 700 }}>
                        {(trade.market === 'US' ? formatUSD : formatRupiah)(calc.pnl)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {selectedTrade ? (
              <>
                <SharedTradeDetail trade={selectedTrade} />
                <TradeReviewPanel
                  trade={selectedTrade}
                  ownerId={userId}
                  currentUser={user}
                  canReview={can('review:shared')}
                  showToast={showToast}
                />
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SharedTradeDetail({ trade }) {
  const calc = calculateTradePnL(trade);
  const isOpen = !trade.sellPrice || !trade.dateSell;
  const isUS = trade.market === 'US';
  const formatMoney = isUS ? formatUSD : formatRupiah;

  let displayPnL = calc.pnl;
  let displayPnLPercent = calc.pnlPercent;
  if (isOpen && trade.sellPrice) {
    const unrealized = calculateUnrealizedPnL(trade.buyPrice, trade.sellPrice, trade.lots, trade.buyFee, trade.market || 'ID');
    displayPnL = unrealized.pnl;
    displayPnLPercent = unrealized.pnlPercent;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Trade Detail {trade.stockCode}</h3>
        <span className={`badge ${isOpen ? 'badge-yellow' : 'badge-green'}`}>{isOpen ? 'Open' : 'Closed'}</span>
      </div>
      <div className="card-body">
        <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
          <div className="calc-result-row"><span className="calc-result-label">Tanggal Beli</span><span className="calc-result-value">{formatDate(trade.dateBuy)}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Tanggal Jual</span><span className="calc-result-value">{trade.dateSell ? formatDate(trade.dateSell) : '-'}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Harga Beli</span><span className="calc-result-value">{formatMoney(trade.buyPrice)}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Harga Jual</span><span className="calc-result-value">{trade.sellPrice ? formatMoney(trade.sellPrice) : '-'}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Qty</span><span className="calc-result-value">{trade.lots}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Strategi</span><span className="calc-result-value">{trade.strategy || '-'}</span></div>
          <div className="calc-result-row"><span className="calc-result-label">Emosi</span><span className="calc-result-value">{trade.emotion || '-'}</span></div>
          <div className="calc-result-row" style={{ borderBottom: 'none' }}>
            <span className="calc-result-label" style={{ fontWeight: 700 }}>P/L</span>
            <span className={`calc-result-value big ${displayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatMoney(displayPnL)} ({formatPercent(displayPnLPercent)})
            </span>
          </div>
        </div>

        {(trade.reasonEntry || trade.reasonExit || trade.notes) ? (
          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            {trade.reasonEntry ? <TextBlock label="Alasan Entry" value={trade.reasonEntry} /> : null}
            {trade.reasonExit ? <TextBlock label="Alasan Exit" value={trade.reasonExit} /> : null}
            {trade.notes ? <TextBlock label="Catatan" value={trade.notes} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TextBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
