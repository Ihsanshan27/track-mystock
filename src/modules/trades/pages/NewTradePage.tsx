import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';

export default function NewTradePage() {
  const { addTrade, allTrades, settings, portfolios, activePortfolioId, tradeFormDraft, setTradeFormDraft, deleteTradingPlan } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(() => {
    if (tradeFormDraft) return tradeFormDraft;
    const plan = location.state?.plan;
    return {
      market: plan?.market || 'ID',
      stockCode: plan?.stockCode || '',
      dateBuy: plan?.createdAt ? plan.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      dateSell: '',
      buyPrice: plan?.entryPrice != null ? String(plan.entryPrice) : '',
      sellPrice: '',
      lots: plan?.lots != null ? String(plan.lots) : '',
      buyFee: settings.defaultBuyFee || 0.15,
      sellFee: settings.defaultSellFee || 0.25,
      strategy: plan?.strategy || '',
      reasonEntry: plan?.reason || '',
      reasonExit: '',
      emotion: '',
      rating: 0,
      tags: plan ? 'rencana-trading' : '',
      notes: '',
      portfolioId: plan?.portfolioId || activePortfolioId || 'default',
    };
  });

  useEffect(() => {
    setTradeFormDraft(form);
  }, [form, setTradeFormDraft]);

  const isFormDirty = () => {
    const plan = location.state?.plan;
    const initialForm = {
      market: plan?.market || 'ID',
      stockCode: plan?.stockCode || '',
      buyPrice: plan?.entryPrice != null ? String(plan.entryPrice) : '',
      sellPrice: '',
      lots: plan?.lots != null ? String(plan.lots) : '',
      strategy: plan?.strategy || '',
      reasonEntry: plan?.reason || '',
      reasonExit: '',
      emotion: '',
      rating: 0,
      tags: plan ? 'rencana-trading' : '',
      notes: '',
      portfolioId: plan?.portfolioId || activePortfolioId || 'default',
    };
    
    return (
      form.market !== initialForm.market ||
      form.stockCode !== initialForm.stockCode ||
      form.buyPrice !== initialForm.buyPrice ||
      form.sellPrice !== initialForm.sellPrice ||
      form.lots !== initialForm.lots ||
      form.strategy !== initialForm.strategy ||
      form.reasonEntry !== initialForm.reasonEntry ||
      form.reasonExit !== initialForm.reasonExit ||
      form.emotion !== initialForm.emotion ||
      form.rating !== initialForm.rating ||
      form.tags !== initialForm.tags ||
      form.notes !== initialForm.notes ||
      form.portfolioId !== initialForm.portfolioId
    );
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (settings.behaviorDoubleConfirmExit && isFormDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settings.behaviorDoubleConfirmExit, form]);

  const handleCancel = () => {
    if (settings.behaviorDoubleConfirmExit && isFormDirty()) {
      if (!window.confirm('Apakah Anda yakin ingin keluar? Data transaksi yang belum disimpan akan hilang.')) {
        return;
      }
    }
    setTradeFormDraft(null);
    navigate('/trades');
  };

  const tradesOnDate = allTrades.filter(t => t.dateBuy === form.dateBuy);
  const dailyLimitReached = settings.behaviorDailyTradeLimitEnabled && tradesOnDate.length >= (settings.behaviorDailyTradeLimit || 3);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.stockCode || !form.dateBuy || !form.buyPrice || !form.lots) {
      alert('Kode saham, tanggal beli, harga beli, dan jumlah wajib diisi');
      return;
    }

    // Behavior Guard: Daily Limit check
    if (dailyLimitReached) {
      alert(`Penyimpanan diblokir: Batas transaksi harian (${settings.behaviorDailyTradeLimit}) untuk tanggal ${form.dateBuy} telah tercapai.`);
      return;
    }

    // Behavior Guard: Required Strategy
    if (settings.behaviorRequireStrategy && !form.strategy) {
      alert('Penyimpanan diblokir: Anda wajib memilih strategi trading.');
      return;
    }

    // Behavior Guard: Required Entry Reason
    if (settings.behaviorRequireReason && !form.reasonEntry.trim()) {
      alert('Penyimpanan diblokir: Anda wajib mengisi alasan entry.');
      return;
    }

    // Behavior Guard: Block Negative Emotion
    if (settings.behaviorBlockNegativeEmotion && form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion)) {
      alert('Penyimpanan diblokir: Anda dilarang menyimpan transaksi saat terdeteksi emosi negatif.');
      return;
    }

    addTrade({
      ...form,
      market: form.market,
      stockCode: form.stockCode.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseFloat(form.lots),
      buyFee: parseFloat(form.buyFee),
      sellFee: parseFloat(form.sellFee),
      rating: form.rating,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    const planId = location.state?.plan?.id;
    if (planId) {
      deleteTradingPlan(planId);
    }

    setTradeFormDraft(null);
    navigate('/trades');
  };

  // Auto-calc preview
  const isUS = form.market === 'US';
  const lots = parseFloat(form.lots) || 0;
  const buyPrice = parseFloat(form.buyPrice) || 0;
  const sellPrice = parseFloat(form.sellPrice) || 0;
  const shares = isUS ? lots : lots * 100;
  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice * shares;
  const buyComm = totalBuy * (parseFloat(form.buyFee) / 100);
  const sellComm = totalSell * (parseFloat(form.sellFee) / 100);
  const pnl = sellPrice ? totalSell - totalBuy - buyComm - sellComm : 0;
  const pnlPct = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;
  
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const capital = isUS ? (settings.initialCapitalUS || 1000) : (settings.initialCapital || 10000000);
  const maxPosVal = capital * ((settings.behaviorMaxPositionSizePercent ?? 20) / 100);
  const isOverSized = settings.behaviorMaxPositionSizeWarning && totalBuy > maxPosVal;

  const strategiesList = settings.customStrategies || STRATEGIES;
  const emotionsList = settings.customEmotions || EMOTIONS;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Catat Transaksi Baru</h1>
          <p className="page-subtitle">Catat detail transaksi trading Anda</p>
        </div>
        <button className="btn btn-ghost" onClick={handleCancel}>← Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Form */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Detail Transaksi</h3></div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Pilih Portofolio</label>
                  <select 
                    className="form-select" 
                    value={form.portfolioId} 
                    onChange={e => set('portfolioId', e.target.value)}
                  >
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Pilih Pasar</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="market" 
                        checked={form.market === 'ID'} 
                        onChange={() => {
                          setForm(prev => ({ 
                            ...prev, 
                            market: 'ID', 
                            buyFee: settings.defaultBuyFee || 0.15, 
                            sellFee: settings.defaultSellFee || 0.25 
                          }));
                        }} 
                      />
                      🇮🇩 Indonesia (IDR)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="market" 
                        checked={form.market === 'US'} 
                        onChange={() => {
                          setForm(prev => ({ 
                            ...prev, 
                            market: 'US', 
                            buyFee: settings.defaultBuyFeeUS || 0, 
                            sellFee: settings.defaultSellFeeUS || 0 
                          }));
                        }} 
                      />
                      🇺🇸 Amerika (USD)
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Kode Saham *</label>
                    <input
                      className="form-input"
                      placeholder={isUS ? 'Contoh: AAPL' : 'Contoh: BBCA'}
                      value={form.stockCode}
                      onChange={e => set('stockCode', e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isUS ? 'Jumlah Lembar (Shares) *' : 'Jumlah Lot *'}</label>
                    <input
                      type="number"
                      step={isUS ? 'any' : '1'}
                      className="form-input"
                      placeholder={isUS ? 'Contoh: 1.5' : 'Contoh: 10'}
                      value={form.lots}
                      onChange={e => set('lots', e.target.value)}
                      min={isUS ? "0.0001" : "1"}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tanggal Beli *</label>
                    <input type="date" className="form-input" value={form.dateBuy} onChange={e => set('dateBuy', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Jual</label>
                    <input type="date" className="form-input" value={form.dateSell} onChange={e => set('dateSell', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Harga Beli (per lembar) *</label>
                    <input type="number" step="any" className="form-input" placeholder={isUS ? "Contoh: 150.5" : "Contoh: 8500"} value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Jual (per lembar)</label>
                    <input type="number" step="any" className="form-input" placeholder="Kosongkan jika masih hold" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fee Beli (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.buyFee} onChange={e => set('buyFee', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee Jual (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.sellFee} onChange={e => set('sellFee', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Analisis & Catatan</h3></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Strategi</label>
                    <select className="form-select" value={form.strategy} onChange={e => set('strategy', e.target.value)}>
                      <option value="">Pilih strategi...</option>
                      {strategiesList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emosi</label>
                    <select className="form-select" value={form.emotion} onChange={e => set('emotion', e.target.value)}>
                      <option value="">Pilih emosi...</option>
                      {emotionsList.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                    {form.emotion && ['fearful', 'greedy', 'revenge', 'doubtful', 'fomo'].includes(form.emotion) && (settings.behaviorNegativeEmotionWarning || settings.behaviorBlockNegativeEmotion) && (
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
                        <strong>{settings.behaviorBlockNegativeEmotion ? '🚫 Blokir Disiplin' : '🧠 Kesadaran Emosi'}</strong>
                        <span>
                          {settings.behaviorBlockNegativeEmotion 
                            ? 'Mode disiplin ketat aktif. Simpan diblokir karena terdeteksi emosi negatif.' 
                            : `Peringatan: Anda trading saat merasa ${emotionsList.find(e => e.value === form.emotion)?.label || form.emotion}. Tetap disiplin!`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Entry</label>
                  <textarea className="form-textarea" placeholder="Kenapa beli saham ini?" value={form.reasonEntry} onChange={e => set('reasonEntry', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Exit</label>
                  <textarea className="form-textarea" placeholder="Kenapa jual saham ini?" value={form.reasonExit} onChange={e => set('reasonExit', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Rating Trade (1-5)</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span
                        key={n}
                        className={`star ${form.rating >= n ? 'filled' : ''}`}
                        onClick={() => set('rating', form.rating === n ? 0 : n)}
                      >★</span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Tags</label>
                  <input className="form-input" placeholder="Pisahkan dengan koma (contoh: bca, dividend)" value={form.tags} onChange={e => set('tags', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Tambahan</label>
                  <textarea className="form-textarea" placeholder="Lessons learned, catatan lain..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-height) + 24px)' }}>
              <div className="card-header"><h3 className="card-title">📊 Preview Kalkulasi</h3></div>
              <div className="card-body">
                <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Kode Saham</span>
                    <span className="calc-result-value">{form.stockCode || '-'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jumlah Lembar</span>
                    <span className="calc-result-value">{shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Total Beli</span>
                    <span className="calc-result-value">{formatMoney(totalBuy)}</span>
                  </div>
                  {sellPrice > 0 && (
                    <>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Total Jual</span>
                        <span className="calc-result-value">{formatMoney(totalSell)}</span>
                      </div>
                      <div className="calc-result-row">
                        <span className="calc-result-label">Total Fee</span>
                        <span className="calc-result-value">{formatMoney(buyComm + sellComm)}</span>
                      </div>
                      <div className="calc-result-row" style={{ borderBottom: 'none', paddingTop: 16 }}>
                        <span className="calc-result-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Profit/Loss</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className={`calc-result-value big ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {pnl >= 0 && '+'}{formatMoney(pnl)}
                          </div>
                          <div className={`${pnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {!sellPrice && buyPrice > 0 && (
                    <div style={{ padding: '16px 0 0', color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                      ⏳ Posisi masih terbuka (belum ada harga jual)
                    </div>
                  )}
                  {isOverSized && (
                    <div style={{ 
                      marginTop: 16, 
                      fontSize: '0.8rem', 
                      padding: '8px 12px', 
                      borderRadius: 6, 
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--accent-yellow)',
                      border: '1px solid var(--accent-yellow)',
                    }}>
                      ⚠️ <strong>Ukuran Posisi Tinggi</strong>: Pembelian ({formatMoney(totalBuy)}) melebihi {settings.behaviorMaxPositionSizePercent}% dari modal awal ({formatMoney(capital)}).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {dailyLimitReached && (
              <div style={{ 
                marginTop: 20,
                fontSize: '0.85rem', 
                padding: '10px 14px', 
                borderRadius: 8, 
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-red)',
                border: '1px solid var(--accent-red)',
              }}>
                🚫 <strong>Batas Transaksi Tercapai</strong>: Anda telah mencatat {tradesOnDate.length} transaksi pada tanggal {form.dateBuy}. Batas harian Anda adalah {settings.behaviorDailyTradeLimit}. Simpan transaksi baru diblokir.
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={dailyLimitReached}>
                💾 Simpan Transaksi {dailyLimitReached && '(Diblokir)'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={handleCancel}>
                Batal
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
