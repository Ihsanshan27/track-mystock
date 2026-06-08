import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateTradePnL, calculateUnrealizedPnL } from '../utils/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '../utils/formatters';
import { STRATEGIES, EMOTIONS } from '../utils/constants';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TradeReviewPanel from '../components/TradeReviewPanel';

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTradeById, updateTrade, deleteTrade, marketPrices, showToast } = useData();
  const trade = getTradeById(id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(trade || {});

  if (!trade) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">Transaksi tidak ditemukan</div>
        <button className="btn btn-primary" onClick={() => navigate('/trades')}>← Kembali</button>
      </div>
    );
  }

  const calc = calculateTradePnL(trade);
  const isOpen = !trade.sellPrice || !trade.dateSell;
  const emotion = EMOTIONS.find(e => e.value === trade.emotion);
  const isUS = trade.market === 'US';
  const formatMoney = isUS ? formatUSD : formatRupiah;

  let displayPnL = calc.pnl;
  let displayPnLPercent = calc.pnlPercent;
  let isEstimasi = false;

  if (isOpen && !trade.sellPrice && marketPrices && marketPrices[trade.stockCode]) {
    const currentPrice = marketPrices[trade.stockCode];
    const { pnl, pnlPercent } = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID');
    displayPnL = pnl;
    displayPnLPercent = pnlPercent;
    isEstimasi = true;
  } else if (isOpen && trade.sellPrice) {
    isEstimasi = true;
  }

  const hasPnL = !isOpen || isEstimasi;

  const handleSave = () => {
    updateTrade(id, {
      ...form,
      stockCode: form.stockCode?.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseInt(form.lots),
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Hapus transaksi ${trade.stockCode}?`)) {
      deleteTrade(id);
      navigate('/trades');
    }
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{trade.stockCode}</h1>
          <p className="page-subtitle">Detail transaksi</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/trades')}>← Kembali</button>
          <button className="btn btn-secondary" onClick={() => { setForm(trade); setEditing(!editing); }}>
            {editing ? '✕ Batal' : '✏️ Edit'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 Hapus</button>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Detail Transaksi {isUS && <span style={{ fontSize: '0.8em', marginLeft: 8 }}>🇺🇸 US</span>}</h3>
            <span className={`badge ${isOpen ? 'badge-yellow' : 'badge-green'}`}>{isOpen ? 'Open' : 'Closed'}</span>
          </div>
          <div className="card-body">
            {editing ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Kode Saham</label>
                    <input className="form-input" value={form.stockCode} onChange={e => set('stockCode', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isUS ? 'Lembar' : 'Lot'}</label>
                    <input type="number" step={isUS ? "any" : "1"} className="form-input" value={form.lots} onChange={e => set('lots', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tgl Beli</label>
                    <input type="date" className="form-input" value={form.dateBuy} onChange={e => set('dateBuy', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tgl Jual</label>
                    <input type="date" className="form-input" value={form.dateSell || ''} onChange={e => set('dateSell', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Harga Beli</label>
                    <input type="number" className="form-input" value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Jual</label>
                    <input type="number" className="form-input" value={form.sellPrice || ''} onChange={e => set('sellPrice', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Strategi</label>
                    <select className="form-select" value={form.strategy || ''} onChange={e => set('strategy', e.target.value)}>
                      <option value="">Pilih strategi...</option>
                      {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emosi</label>
                    <select className="form-select" value={form.emotion || ''} onChange={e => set('emotion', e.target.value)}>
                      <option value="">Pilih emosi...</option>
                      {EMOTIONS.map(em => <option key={em.value} value={em.value}>{em.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alasan Entry</label>
                  <textarea className="form-textarea" value={form.reasonEntry || ''} onChange={e => set('reasonEntry', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alasan Exit</label>
                  <textarea className="form-textarea" value={form.reasonExit || ''} onChange={e => set('reasonExit', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Custom Tags</label>
                  <input className="form-input" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags || ''} onChange={e => set('tags', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleSave}>💾 Simpan Perubahan</button>
              </>
            ) : (
              <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                <div className="calc-result-row"><span className="calc-result-label">Kode Saham</span><span className="calc-result-value">{trade.stockCode}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Tanggal Beli</span><span className="calc-result-value">{formatDate(trade.dateBuy)}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Tanggal Jual</span><span className="calc-result-value">{trade.dateSell ? formatDate(trade.dateSell) : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Harga Beli</span><span className="calc-result-value">{formatMoney(trade.buyPrice)}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Harga Jual</span><span className="calc-result-value">{trade.sellPrice ? formatMoney(trade.sellPrice) : (marketPrices && marketPrices[trade.stockCode] ? <span style={{color: 'var(--text-muted)'}}>{formatMoney(marketPrices[trade.stockCode])} (est)</span> : '-')}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">{isUS ? 'Shares' : 'Lot'}</span><span className="calc-result-value">{trade.lots} {isUS ? 'lembar' : `(${trade.lots * 100} lembar)`}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Total Beli</span><span className="calc-result-value">{formatMoney(calc.totalBuy)}</span></div>
                {!isOpen && <div className="calc-result-row"><span className="calc-result-label">Total Jual</span><span className="calc-result-value">{formatMoney(calc.totalSell)}</span></div>}
                {!isOpen && <div className="calc-result-row"><span className="calc-result-label">Total Fee</span><span className="calc-result-value">{formatMoney(calc.totalFee)}</span></div>}
                {hasPnL && (
                  <div className="calc-result-row" style={{ borderBottom: 'none' }}>
                    <span className="calc-result-label" style={{ fontWeight: 600 }}>{isEstimasi ? 'Estimasi P/L' : 'Profit/Loss'}</span>
                    <span className={`calc-result-value big ${displayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatMoney(displayPnL)} ({formatPercent(displayPnLPercent)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Analisis</h3></div>
            <div className="card-body">
              <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                <div className="calc-result-row"><span className="calc-result-label">Strategi</span><span className="calc-result-value">{trade.strategy ? <span className="badge badge-blue">{trade.strategy}</span> : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Emosi</span><span className="calc-result-value">{emotion ? emotion.label : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Rating</span><span className="calc-result-value">{trade.rating ? '⭐'.repeat(trade.rating) : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Tags</span><span className="calc-result-value">
                  {trade.tags && trade.tags.length > 0 ? trade.tags.map(t => <span key={t} className="badge" style={{ marginRight: 4 }}>#{t}</span>) : '-'}
                </span></div>
              </div>
            </div>
          </div>

          {(trade.reasonEntry || trade.reasonExit || trade.notes) && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Catatan</h3></div>
              <div className="card-body">
                {trade.reasonEntry && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Alasan Entry:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.reasonEntry}</div>
                  </div>
                )}
                {trade.reasonExit && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Alasan Exit:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.reasonExit}</div>
                  </div>
                )}
                {trade.notes && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Catatan:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TradeReviewPanel
        trade={trade}
        ownerId={user?.id}
        currentUser={user}
        canReview={false}
        showToast={showToast}
      />
    </div>
  );
}
