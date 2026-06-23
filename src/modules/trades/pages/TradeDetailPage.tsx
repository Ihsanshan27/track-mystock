import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { calculateTradePnL, calculateUnrealizedPnL, getTradeAssetTypeLabel, getTradeQuantityLabel, getTradeQuantityUnits } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import TradeReviewPanel from '@/modules/trades/components/TradeReviewPanel';
import * as Icons from 'lucide-react';

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTradeById, updateTrade, deleteTrade, marketPrices, showToast, portfolios, settings, tradeEditDraft, setTradeEditDraft } = useData();
  const { alert, confirm } = useDialog();
  const trade = getTradeById(id);

  const draftForThis = tradeEditDraft?.tradeId === id ? tradeEditDraft : null;
  const [editing, setEditing] = useState<boolean>(() => draftForThis?.editing ?? false);
  const [form, setForm] = useState<any>(() => draftForThis?.form ?? trade ?? {});

  useEffect(() => {
    if (editing) {
      setTradeEditDraft({ tradeId: id, editing, form });
    }
  }, [editing, form, id, setTradeEditDraft]);

  if (!trade) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">X</div>
        <div className="empty-state-title">Transaksi tidak ditemukan</div>
        <button className="btn btn-primary" onClick={() => navigate('/trades')}>Kembali</button>
      </div>
    );
  }

  const strategiesList = settings.customStrategies || STRATEGIES;
  const emotionsList = settings.customEmotions || EMOTIONS;

  const calc = calculateTradePnL(trade);
  const isOpen = !trade.sellPrice || !trade.dateSell;
  const emotion = emotionsList.find((item) => item.value === trade.emotion);
  const isUS = trade.market === 'US';
  const isMutualFund = trade.assetType === 'mutual_fund';
  const formatMoney = isUS ? formatUSD : formatRupiah;
  const quantityLabel = getTradeQuantityLabel(trade);

  let displayPnL = calc.pnl;
  let displayPnLPercent = calc.pnlPercent;
  let isEstimasi = false;

  if (isOpen && !trade.sellPrice && marketPrices && marketPrices[trade.stockCode]) {
    const currentPrice = marketPrices[trade.stockCode];
    const { pnl, pnlPercent } = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
    displayPnL = pnl;
    displayPnLPercent = pnlPercent;
    isEstimasi = true;
  } else if (isOpen && trade.sellPrice) {
    isEstimasi = true;
  }

  const hasPnL = !isOpen || isEstimasi;

  const handleSave = async () => {
    if (settings.behaviorRequireStrategy && !form.strategy) {
      await alert('Penyimpanan diblokir: Anda wajib memilih strategi trading.', {
        title: 'Gagal Menyimpan',
        severity: 'warning'
      });
      return;
    }

    if (settings.behaviorRequireReason && !form.reasonEntry?.trim()) {
      await alert('Penyimpanan diblokir: Anda wajib mengisi alasan entry.', {
        title: 'Gagal Menyimpan',
        severity: 'warning'
      });
      return;
    }

    if (settings.behaviorBlockNegativeEmotion && form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion)) {
      await alert('Penyimpanan diblokir: Anda dilarang menyimpan transaksi saat terdeteksi emosi negatif.', {
        title: 'Gagal Menyimpan',
        severity: 'danger'
      });
      return;
    }

    updateTrade(id, {
      ...form,
      assetType: form.assetType || 'stock',
      stockCode: form.assetType === 'mutual_fund' ? form.stockCode?.trim() : form.stockCode?.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseFloat(form.lots),
      portfolioId: form.portfolioId || 'default',
      tags: typeof form.tags === 'string' ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : form.tags,
      setupImageUrl: form.setupImageUrl ? form.setupImageUrl.trim() : '',
    });
    setEditing(false);
    setTradeEditDraft(null);
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus transaksi ${trade.stockCode}?`, {
      title: 'Hapus Transaksi',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (isConfirmed) {
      deleteTrade(id);
      setTradeEditDraft(null);
      navigate('/trades');
    }
  };

  const handleCancelEdit = () => {
    setForm(trade);
    setEditing(false);
    setTradeEditDraft(null);
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{trade.stockCode}</h1>
          <p className="page-subtitle">Detail transaksi</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/trades')}>Kembali</button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (editing) {
                handleCancelEdit();
              } else {
                setForm(trade);
                setEditing(true);
              }
            }}
          >
            {editing ? 'Batal' : 'Edit'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Hapus</button>
        </div>
      </div>

      {editing ? (
        <div className="floating-form-actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ minWidth: 180 }} onClick={handleSave}>Simpan Perubahan</button>
            <button className="btn btn-secondary" onClick={handleCancelEdit}>Batal</button>
          </div>
        </div>
      ) : null}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Detail Transaksi {isUS ? <span style={{ fontSize: '0.8em', marginLeft: 8 }}>US</span> : null}</h3>
              <span className={`badge ${isOpen ? 'badge-yellow' : 'badge-green'}`}>{isOpen ? 'Open' : 'Closed'}</span>
            </div>
            <div className="card-body">
              {editing ? (
                <>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Portofolio</label>
                    <select className="form-select" value={form.portfolioId || 'default'} onChange={e => set('portfolioId', e.target.value)}>
                      {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{isMutualFund ? 'Nama / Kode Reksadana' : 'Kode Saham'}</label>
                      <input className="form-input" value={form.stockCode} onChange={e => set('stockCode', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isMutualFund ? 'Unit' : isUS ? 'Lembar' : 'Lot'}</label>
                      <input type="number" step={isMutualFund || isUS ? 'any' : '1'} className="form-input" value={form.lots} onChange={e => set('lots', e.target.value)} />
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
                      <label className="form-label">{isMutualFund ? 'NAB Beli' : 'Harga Beli'}</label>
                      <input type="number" className="form-input" value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isMutualFund ? 'NAB Jual' : 'Harga Jual'}</label>
                      <input type="number" className="form-input" value={form.sellPrice || ''} onChange={e => set('sellPrice', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Strategi</label>
                      <select className="form-select" value={form.strategy || ''} onChange={e => set('strategy', e.target.value)}>
                        <option value="">Pilih strategi...</option>
                        {strategiesList.map((strategy) => <option key={strategy} value={strategy}>{strategy}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Emosi</label>
                      <select className="form-select" value={form.emotion || ''} onChange={e => set('emotion', e.target.value)}>
                        <option value="">Pilih emosi...</option>
                        {emotionsList.map((emotionItem) => <option key={emotionItem.value} value={emotionItem.value}>{emotionItem.label}</option>)}
                      </select>
                      {form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion) && (settings.behaviorNegativeEmotionWarning || settings.behaviorBlockNegativeEmotion) ? (
                        <div style={{
                          marginTop: 6,
                          fontSize: '0.8rem',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: settings.behaviorBlockNegativeEmotion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: settings.behaviorBlockNegativeEmotion ? 'var(--accent-red)' : 'var(--accent-yellow)',
                          border: `1px solid ${settings.behaviorBlockNegativeEmotion ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2
                        }}>
                          <strong>{settings.behaviorBlockNegativeEmotion ? 'Blokir Disiplin' : 'Kesadaran Emosi'}</strong>
                          <span>
                            {settings.behaviorBlockNegativeEmotion
                              ? 'Mode disiplin ketat aktif. Simpan diblokir karena terdeteksi emosi negatif.'
                              : `Peringatan: Anda trading saat merasa ${emotionsList.find((item) => item.value === form.emotion)?.label || form.emotion}. Tetap disiplin!`}
                          </span>
                        </div>
                      ) : null}
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
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Tautan Gambar Setup Chart (URL)</label>
                    <input className="form-input" placeholder="Contoh: https://s3.tradingview.com/x/xxxxxx.png" value={form.setupImageUrl || ''} onChange={e => set('setupImageUrl', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan</label>
                    <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="calc-result-row"><span className="calc-result-label">{isMutualFund ? 'Produk' : 'Kode Saham'}</span><span className="calc-result-value">{trade.stockCode}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">Jenis Aset</span><span className="calc-result-value">{getTradeAssetTypeLabel(trade)}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">Tanggal Beli</span><span className="calc-result-value">{formatDate(trade.dateBuy)}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">Tanggal Jual</span><span className="calc-result-value">{trade.dateSell ? formatDate(trade.dateSell) : '-'}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">{isMutualFund ? 'NAB Beli' : 'Harga Beli'}</span><span className="calc-result-value">{formatMoney(trade.buyPrice)}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">{isMutualFund ? 'NAB Jual' : 'Harga Jual'}</span><span className="calc-result-value">{trade.sellPrice ? formatMoney(trade.sellPrice) : (marketPrices && marketPrices[trade.stockCode] ? <span style={{ color: 'var(--text-muted)' }}>{formatMoney(marketPrices[trade.stockCode])} (est)</span> : '-')}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">{isMutualFund ? 'Unit' : isUS ? 'Shares' : 'Lot'}</span><span className="calc-result-value">{trade.lots} {isMutualFund ? quantityLabel : isUS ? 'lembar' : `(${getTradeQuantityUnits(trade)} lembar)`}</span></div>
                  <div className="calc-result-row"><span className="calc-result-label">Total Beli</span><span className="calc-result-value">{formatMoney(calc.totalBuy)}</span></div>
                  {!isOpen ? <div className="calc-result-row"><span className="calc-result-label">Total Jual</span><span className="calc-result-value">{formatMoney(calc.totalSell)}</span></div> : null}
                  {!isOpen ? <div className="calc-result-row"><span className="calc-result-label">Total Fee</span><span className="calc-result-value">{formatMoney(calc.totalFee)}</span></div> : null}
                  {hasPnL ? (
                    <div className="calc-result-row" style={{ borderBottom: 'none' }}>
                      <span className="calc-result-label" style={{ fontWeight: 600 }}>{isEstimasi ? 'Estimasi P/L' : 'Profit/Loss'}</span>
                      <span className={`calc-result-value big ${displayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatMoney(displayPnL)} ({formatPercent(displayPnLPercent)})
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Analisis</h3></div>
            <div className="card-body">
              <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                <div className="calc-result-row"><span className="calc-result-label">Strategi</span><span className="calc-result-value">{trade.strategy ? <span className="badge badge-blue">{trade.strategy}</span> : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Emosi</span><span className="calc-result-value">{emotion ? emotion.label : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Rating</span><span className="calc-result-value">{trade.rating ? '★'.repeat(trade.rating) : '-'}</span></div>
                <div className="calc-result-row"><span className="calc-result-label">Tags</span><span className="calc-result-value">{trade.tags && trade.tags.length > 0 ? trade.tags.map((tag) => <span key={tag} className="badge" style={{ marginRight: 4 }}>#{tag}</span>) : '-'}</span></div>
              </div>
            </div>
          </div>

          {(trade.reasonEntry || trade.reasonExit || trade.notes) ? (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Catatan</h3></div>
              <div className="card-body">
                {trade.reasonEntry ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Alasan Entry:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.reasonEntry}</div>
                  </div>
                ) : null}
                {trade.reasonExit ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Alasan Exit:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.reasonExit}</div>
                  </div>
                ) : null}
                {trade.notes ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Catatan:</div>
                    <div style={{ fontSize: '0.9rem' }}>{trade.notes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {trade.setupImageUrl ? (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header"><h3 className="card-title">🖼 Setup Chart</h3></div>
              <div className="card-body" style={{ padding: 12, textAlign: 'center' }}>
                <a href={trade.setupImageUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={trade.setupImageUrl}
                    alt="Setup Chart"
                    style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxHeight: '350px', objectFit: 'contain' }}
                  />
                </a>
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <a href={trade.setupImageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue-light)', textDecoration: 'underline' }}>
                    Buka Gambar di Tab Baru ↗
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {trade.history && trade.history.length > 0 && (
        <div className="card" style={{ marginTop: 24, marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.History size={18} style={{ color: 'var(--accent-blue-light)' }} />
            <h3 className="card-title">Histori Perubahan Transaksi</h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {trade.history.map((log, index) => {
                // Compute changed fields
                const keys = Array.from(new Set([...Object.keys(log.before || {}), ...Object.keys(log.after || {})]));
                const changes = [];
                for (const key of keys) {
                  if (key === 'history' || key === 'updatedAt' || key === 'createdAt') continue;
                  const valBefore = log.before[key];
                  const valAfter = log.after[key];
                  
                  if (Array.isArray(valBefore) || Array.isArray(valAfter)) {
                    const strBefore = (valBefore || []).join(', ');
                    const strAfter = (valAfter || []).join(', ');
                    if (strBefore !== strAfter) {
                      changes.push({ field: key, before: strBefore || '—', after: strAfter || '—' });
                    }
                  } else if (valBefore !== valAfter) {
                    changes.push({ field: key, before: valBefore ?? '—', after: valAfter ?? '—' });
                  }
                }

                const fieldLabels: Record<string, string> = {
                  assetType: 'Jenis Aset',
                  market: 'Pasar',
                  stockCode: 'Kode Saham',
                  dateBuy: 'Tanggal Beli',
                  dateSell: 'Tanggal Jual',
                  buyPrice: 'Harga Beli/NAB',
                  sellPrice: 'Harga Jual/NAB',
                  lots: 'Kuantitas (Lot/Shares/Unit)',
                  buyFee: 'Fee Beli (%)',
                  sellFee: 'Fee Jual (%)',
                  strategy: 'Strategi',
                  reasonEntry: 'Alasan Entry',
                  reasonExit: 'Alasan Exit',
                  emotion: 'Emosi',
                  rating: 'Rating',
                  tags: 'Tag',
                  notes: 'Catatan',
                  portfolioId: 'Portofolio',
                  setupImageUrl: 'URL Setup Chart'
                };

                const formatValueForDisplay = (field: string, val: any) => {
                  if (val === '—') return val;
                  if (field === 'buyPrice' || field === 'sellPrice') {
                    return typeof val === 'number' ? formatMoney(val) : val;
                  }
                  if (field === 'portfolioId') {
                    const port = portfolios.find((p: any) => p.id === val);
                    return port ? port.name : val;
                  }
                  if (field === 'emotion') {
                    const em = emotionsList.find((e: any) => e.value === val);
                    return em ? em.label : val;
                  }
                  return String(val);
                };

                return (
                  <div
                    key={index}
                    style={{
                      borderBottom: index < (trade.history || []).length - 1 ? '1px solid var(--border-color)' : 'none',
                      paddingBottom: index < (trade.history || []).length - 1 ? 16 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        👤 Penyunting: <span style={{ color: 'var(--accent-blue-light)' }}>{log.editedBy}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        📅 Waktu: {new Date(log.editedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {changes.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Penyimpanan tanpa perubahan nilai field.</div>
                    ) : (
                      <div className="table-container" style={{ margin: 0, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6 }}>
                        <table className="table" style={{ margin: 0, fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <th style={{ padding: '6px 12px' }}>Nama Kolom</th>
                              <th style={{ padding: '6px 12px' }}>Sebelum</th>
                              <th style={{ padding: '6px 12px' }}>Sesudah</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changes.map((c, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fieldLabels[c.field] || c.field}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatValueForDisplay(c.field, c.before)}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--accent-blue-light)', fontWeight: 600 }}>{formatValueForDisplay(c.field, c.after)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editing ? (
        <div className="mobile-sticky-actions">
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleSave}>Simpan Perubahan</button>
          <button className="btn btn-secondary btn-lg" onClick={handleCancelEdit}>Batal</button>
        </div>
      ) : null}

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
