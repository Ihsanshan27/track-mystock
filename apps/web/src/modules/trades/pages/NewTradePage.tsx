import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import { getTradeQuantityLabel } from '@/modules/trades/calculations';

export default function NewTradePage() {
  const { addTrade, allTrades, settings, portfolios, activePortfolioId, defaultPortfolioId, tradeFormDraft, setTradeFormDraft, deleteTradingPlan } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const { alert, confirm } = useDialog();

  const [form, setForm] = useState(() => {
    if (tradeFormDraft) return tradeFormDraft;
    const plan = location.state?.plan;
    return {
      assetType: 'stock',
      market: plan?.market || 'ID',
      stockCode: plan?.stockCode || '',
      dateBuy: plan?.createdAt ? plan.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      dateSell: plan?.dateSell || '',
      buyPrice: plan?.entryPrice != null ? String(plan.entryPrice) : '',
      sellPrice: plan?.sellPrice != null && Number(plan.sellPrice) > 0 ? String(plan.sellPrice) : '',
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
      setupImageUrl: '',
      portfolioId: plan?.portfolioId || activePortfolioId || defaultPortfolioId,
    };
  });

  useEffect(() => {
    setTradeFormDraft(form);
  }, [form, setTradeFormDraft]);

  const isFormDirty = () => {
    const plan = location.state?.plan;
    const initialForm = {
      assetType: 'stock',
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
      portfolioId: plan?.portfolioId || activePortfolioId || defaultPortfolioId,
    };

    return (
      form.market !== initialForm.market ||
      form.assetType !== initialForm.assetType ||
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
      form.setupImageUrl !== initialForm.setupImageUrl ||
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

  const handleCancel = async () => {
    if (settings.behaviorDoubleConfirmExit && isFormDirty()) {
      const isConfirmed = await confirm('Apakah Anda yakin ingin keluar? Data transaksi yang belum disimpan akan hilang.', {
        title: 'Keluar Halaman',
        severity: 'warning'
      });
      if (!isConfirmed) {
        return;
      }
    }
    setTradeFormDraft(null);
    navigate('/trades');
  };

  const tradesOnDate = allTrades.filter((trade) => trade.dateBuy === form.dateBuy);
  const dailyLimitReached = settings.behaviorDailyTradeLimitEnabled && tradesOnDate.length >= (settings.behaviorDailyTradeLimit || 3);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.stockCode || !form.dateBuy || !form.buyPrice || !form.lots) {
      await alert('Kode saham, tanggal beli, harga beli, dan jumlah wajib diisi', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }

    if (dailyLimitReached) {
      await alert(`Penyimpanan diblokir: Batas transaksi harian (${settings.behaviorDailyTradeLimit}) untuk tanggal ${form.dateBuy} telah tercapai.`, {
        title: 'Batas Harian Tercapai',
        severity: 'danger'
      });
      return;
    }

    if (settings.behaviorRequireStrategy && !form.strategy) {
      await alert('Penyimpanan diblokir: Anda wajib memilih strategi trading.', {
        title: 'Gagal Menyimpan',
        severity: 'warning'
      });
      return;
    }

    if (settings.behaviorRequireReason && !form.reasonEntry.trim()) {
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

    addTrade({
      ...form,
      assetType: form.assetType || 'stock',
      market: form.market,
      stockCode: isMutualFund ? form.stockCode.trim() : form.stockCode.toUpperCase(),
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      lots: parseFloat(form.lots),
      buyFee: parseFloat(form.buyFee),
      sellFee: parseFloat(form.sellFee),
      rating: form.rating,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      setupImageUrl: form.setupImageUrl ? form.setupImageUrl.trim() : '',
    });

    const planId = location.state?.plan?.id;
    if (planId) {
      deleteTradingPlan(planId);
    }

    setTradeFormDraft(null);
    navigate('/trades');
  };

  const isUS = form.market === 'US';
  const isMutualFund = form.assetType === 'mutual_fund';
  const lots = parseFloat(form.lots) || 0;
  const buyPrice = parseFloat(form.buyPrice) || 0;
  const sellPrice = parseFloat(form.sellPrice) || 0;
  const shares = isMutualFund ? lots : (isUS ? lots : lots * 100);
  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice * shares;
  const buyComm = totalBuy * (parseFloat(form.buyFee) / 100);
  const sellComm = totalSell * (parseFloat(form.sellFee) / 100);
  const pnl = sellPrice ? totalSell - totalBuy - buyComm - sellComm : 0;
  const pnlPct = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;

  const formatMoney = isUS ? formatUSD : formatRupiah;
  const capital = isUS ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000);
  const maxPosVal = capital * ((settings.behaviorMaxPositionSizePercent ?? 20) / 100);
  const isOverSized = settings.behaviorMaxPositionSizeWarning && totalBuy > maxPosVal;
  const strategiesList = settings.customStrategies || STRATEGIES;
  const emotionsList = settings.customEmotions || EMOTIONS;
  const saveLabel = `Simpan Transaksi${dailyLimitReached ? ' (Diblokir)' : ''}`;
  const quantityLabel = getTradeQuantityLabel({ assetType: form.assetType, market: form.market });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catat Transaksi Baru</h1>
          <p className="page-subtitle">Catat detail transaksi trading Anda</p>
        </div>
        <button className="btn btn-ghost" onClick={handleCancel}>Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="floating-form-actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 180 }} disabled={dailyLimitReached}>
              {saveLabel}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Batal
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
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
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Jenis Aset</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assetType"
                        checked={form.assetType !== 'mutual_fund'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            assetType: 'stock',
                            market: prev.market === 'US' ? 'US' : 'ID',
                            buyFee: prev.market === 'US' ? (settings.defaultBuyFeeUS || 0) : (settings.defaultBuyFee || 0.15),
                            sellFee: prev.market === 'US' ? (settings.defaultSellFeeUS || 0) : (settings.defaultSellFee || 0.25),
                          }));
                        }}
                      />
                      Saham
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assetType"
                        checked={form.assetType === 'mutual_fund'}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            assetType: 'mutual_fund',
                            market: 'ID',
                            buyFee: 0,
                            sellFee: 0,
                          }));
                        }}
                      />
                      Reksadana
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Pilih Pasar</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="market"
                        checked={form.market === 'ID'}
                        disabled={isMutualFund}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            market: 'ID',
                            buyFee: settings.defaultBuyFee || 0.15,
                            sellFee: settings.defaultSellFee || 0.25
                          }));
                        }}
                      />
                      Indonesia (IDR)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="market"
                        checked={form.market === 'US'}
                        disabled={isMutualFund}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            market: 'US',
                            buyFee: settings.defaultBuyFeeUS || 0,
                            sellFee: settings.defaultSellFeeUS || 0
                          }));
                        }}
                      />
                      Amerika (USD)
                    </label>
                  </div>
                  {isMutualFund ? (
                    <div style={{ fontSize: '0.75rem', marginTop: 6, color: 'var(--text-muted)' }}>
                      Reksadana saat ini dicatat sebagai instrumen IDR dengan jumlah unit.
                    </div>
                  ) : null}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{isMutualFund ? 'Nama / Kode Reksadana *' : 'Kode Saham *'}</label>
                    <input
                      className="form-input"
                      placeholder={isMutualFund ? 'Contoh: Sucorinvest Money Market Fund' : isUS ? 'Contoh: AAPL' : 'Contoh: BBCA'}
                      value={form.stockCode}
                      onChange={e => set('stockCode', isMutualFund ? e.target.value : e.target.value.toUpperCase())}
                      style={isMutualFund ? undefined : { textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {isMutualFund ? 'Jumlah Unit *' : isUS ? 'Jumlah Lembar (Shares) *' : 'Jumlah Lot *'}
                    </label>
                    <input
                      type="number"
                      step={isMutualFund || isUS ? 'any' : '1'}
                      className="form-input"
                      placeholder={isMutualFund ? 'Contoh: 1250.45' : isUS ? 'Contoh: 1.5' : 'Contoh: 10'}
                      value={form.lots}
                      onChange={e => set('lots', e.target.value)}
                      min={isMutualFund || isUS ? '0.0001' : '1'}
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
                    <label className="form-label">{isMutualFund ? 'NAB Beli per Unit *' : 'Harga Beli (per lembar) *'}</label>
                    <input type="number" step="any" className="form-input" placeholder={isMutualFund ? 'Contoh: 1287.35' : isUS ? 'Contoh: 150.5' : 'Contoh: 8500'} value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isMutualFund ? 'NAB Jual per Unit' : 'Harga Jual (per lembar)'}</label>
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
                      {strategiesList.map((strategy: string) => <option key={strategy} value={strategy}>{strategy}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emosi</label>
                    <select className="form-select" value={form.emotion} onChange={e => set('emotion', e.target.value)}>
                      <option value="">Pilih emosi...</option>
                      {emotionsList.map((emotion: any) => <option key={emotion.value} value={emotion.value}>{emotion.label}</option>)}
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
                  <textarea className="form-textarea" placeholder="Kenapa beli saham ini?" value={form.reasonEntry} onChange={e => set('reasonEntry', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Exit</label>
                  <textarea className="form-textarea" placeholder="Kenapa jual saham ini?" value={form.reasonExit} onChange={e => set('reasonExit', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Rating Trade (1-5)</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`star ${form.rating >= star ? 'filled' : ''}`}
                        onClick={() => set('rating', form.rating === star ? 0 : star)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Tags</label>
                  <input className="form-input" placeholder="Pisahkan dengan koma (contoh: bca, dividend)" value={form.tags} onChange={e => set('tags', e.target.value)} />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Tautan Gambar Setup Chart (URL)</label>
                  <input className="form-input" placeholder="Contoh: https://s3.tradingview.com/x/xxxxxx.png" value={form.setupImageUrl} onChange={e => set('setupImageUrl', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Tambahan</label>
                  <textarea className="form-textarea" placeholder="Lessons learned, catatan lain..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>

          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-height) + 24px)' }}>
              <div className="card-header"><h3 className="card-title">Preview Kalkulasi</h3></div>
              <div className="card-body">
                <div className="calc-result" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">{isMutualFund ? 'Produk' : 'Kode Saham'}</span>
                    <span className="calc-result-value">{form.stockCode || '-'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jenis Aset</span>
                    <span className="calc-result-value">{isMutualFund ? 'Reksadana' : 'Saham'}</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Jumlah {quantityLabel}</span>
                    <span className="calc-result-value">
                      {shares.toLocaleString(isMutualFund ? 'id-ID' : 'en-US', { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Total Beli</span>
                    <span className="calc-result-value">{formatMoney(totalBuy)}</span>
                  </div>
                  {sellPrice > 0 ? (
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
                            {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                          </div>
                          <div className={`${pnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {!sellPrice && buyPrice > 0 ? (
                    <div style={{ padding: '16px 0 0', color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                      Posisi masih terbuka (belum ada harga jual)
                    </div>
                  ) : null}
                  {isOverSized ? (
                    <div style={{
                      marginTop: 16,
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--accent-yellow)',
                      border: '1px solid var(--accent-yellow)',
                    }}>
                      <strong>Ukuran Posisi Tinggi</strong>: Pembelian ({formatMoney(totalBuy)}) melebihi {settings.behaviorMaxPositionSizePercent}% dari modal awal ({formatMoney(capital)}).
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {dailyLimitReached ? (
              <div style={{
                marginTop: 20,
                fontSize: '0.85rem',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-red)',
                border: '1px solid var(--accent-red)',
              }}>
                <strong>Batas Transaksi Tercapai</strong>: Anda telah mencatat {tradesOnDate.length} transaksi pada tanggal {form.dateBuy}. Batas harian Anda adalah {settings.behaviorDailyTradeLimit}. Simpan transaksi baru diblokir.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mobile-sticky-actions">
          <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={dailyLimitReached}>
            {saveLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={handleCancel}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
