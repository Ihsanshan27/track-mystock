import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import * as Icons from 'lucide-react';

export default function TradingPlansPage() {
  const {
    tradingPlans,
    addTradingPlan,
    deleteTradingPlan,
    portfolios,
    activePortfolioId,
    trades,
    cashflows,
    dividends,
    settings,
    canWrite
  } = useData();

  const navigate = useNavigate();
  const { alert, confirm } = useDialog();

  const DRAFT_KEY = 'trading_plan_form_draft';
  const DRAFT_OPEN_KEY = 'trading_plan_form_open';

  // Persist form state across navigation using sessionStorage
  const [showForm, setShowFormState] = useState<boolean>(
    () => sessionStorage.getItem(DRAFT_OPEN_KEY) === 'true'
  );

  const [form, setFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : {
        stockCode: '',
        market: 'ID',
        entryPrice: '',
        stopLoss: '',
        targetProfit: '',
        riskPercent: settings.defaultRiskPercent || 2,
        portfolioId: activePortfolioId || 'default',
        reason: '',
      };
    } catch {
      return {
        stockCode: '',
        market: 'ID',
        entryPrice: '',
        stopLoss: '',
        targetProfit: '',
        riskPercent: settings.defaultRiskPercent || 2,
        portfolioId: activePortfolioId || 'default',
        reason: '',
      };
    }
  });

  const setShowForm = (v: boolean) => {
    setShowFormState(v);
    sessionStorage.setItem(DRAFT_OPEN_KEY, String(v));
  };

  const set = (key: string, value: any) => setFormState(prev => {
    const next = { ...prev, [key]: value };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_OPEN_KEY);
    setFormState({
      stockCode: '',
      market: 'ID',
      entryPrice: '',
      stopLoss: '',
      targetProfit: '',
      riskPercent: settings.defaultRiskPercent || 2,
      portfolioId: activePortfolioId || 'default',
      reason: '',
    });
    setShowFormState(false);
  };

  const activePort = portfolios.find(p => p.id === form.portfolioId) || portfolios[0] || { id: 'default', name: 'Utama' };

  // Calculate Buying Power for risk calculations
  const buyingPower = useMemo(() => {
    const pTrades = trades.filter((t: any) => (t.portfolioId || 'default') === activePort.id);
    const pCashflows = cashflows.filter((c: any) => (c.portfolioId || 'default') === activePort.id);
    const pDividends = dividends.filter((d: any) => (d.portfolioId || 'default') === activePort.id);

    const isUS = form.market === 'US';
    const initialCap = activePort.id === 'default' ? (isUS ? (settings.initialCapitalUS || 1000) : settings.initialCapital) : 0;

    const stats = calculatePortfolioBalance(
      pTrades.filter((t: any) => isUS ? t.market === 'US' : t.market !== 'US'),
      pCashflows.filter((c: any) => isUS ? c.market === 'US' : c.market !== 'US'),
      pDividends.filter((d: any) => isUS ? d.market === 'US' : d.market !== 'US'),
      initialCap
    );
    return stats.buyingPower;
  }, [trades, cashflows, dividends, activePort.id, form.market, settings]);

  // Real-time calculations
  const entry = parseFloat(form.entryPrice) || 0;
  const sl = parseFloat(form.stopLoss) || 0;
  const tp = parseFloat(form.targetProfit) || 0;
  const riskPct = parseFloat(form.riskPercent as any) || 0;

  const riskPerShare = entry - sl;
  const rewardPerShare = tp - entry;

  const rrRatio = riskPerShare > 0 && rewardPerShare > 0 ? (rewardPerShare / riskPerShare) : 0;
  const riskAmount = buyingPower * (riskPct / 100);

  const calculatedShares = riskPerShare > 0 ? (riskAmount / riskPerShare) : 0;
  const isUS = form.market === 'US';
  const calculatedLots = isUS ? calculatedShares : calculatedShares / 100;
  const requiredCapital = calculatedShares * entry;

  const formatMoney = isUS ? formatUSD : formatRupiah;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode || !form.entryPrice || !form.stopLoss || !form.targetProfit) {
      await alert('Mohon isi semua field yang wajib.', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }
    if (sl >= entry) {
      await alert('Stop Loss harus lebih rendah dari harga Entry.', {
        title: 'Validasi Rencana',
        severity: 'warning'
      });
      return;
    }
    if (tp <= entry) {
      await alert('Target Profit harus lebih tinggi dari harga Entry.', {
        title: 'Validasi Rencana',
        severity: 'warning'
      });
      return;
    }

    addTradingPlan({
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      entryPrice: entry,
      stopLoss: sl,
      targetProfit: tp,
      riskPercent: riskPct,
      lots: parseFloat(calculatedLots.toFixed(2)),
      rrRatio: parseFloat(rrRatio.toFixed(2)),
      requiredCapital: parseFloat(requiredCapital.toFixed(2)),
    });

    clearDraft();
  };

  const handleConvert = (plan: any) => {
    // Navigate to new trade form with prefilled plan state
    navigate('/trades/new', { state: { plan } });
  };

  const blurStyle = usePrivacyStyle();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Rencana Trading (Trading Plans)</h1>
          <p className="page-subtitle">Rencanakan transaksi Anda dengan manajemen risiko otomatis</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
            {showForm ? 'Batal' : 'Rencana Baru'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">Buat Rencana Baru</h3></div>
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pasar</label>
                  <select className="form-select" value={form.market} onChange={e => set('market', e.target.value)}>
                    <option value="ID">Pasar Indonesia (Rp)</option>
                    <option value="US">Pasar Amerika ($)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kode Saham *</label>
                  <input
                    className="form-input"
                    placeholder="BBCA atau AAPL"
                    value={form.stockCode}
                    onChange={e => set('stockCode', e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pilih Dompet / Portofolio</label>
                  <select className="form-select" value={form.portfolioId} onChange={e => set('portfolioId', e.target.value)}>
                    {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Harga Entry (Beli) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="8500"
                    value={form.entryPrice}
                    onChange={e => set('entryPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stop Loss (SL) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="8000"
                    value={form.stopLoss}
                    onChange={e => set('stopLoss', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Profit (TP) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="9500"
                    value={form.targetProfit}
                    onChange={e => set('targetProfit', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Resiko per Trade (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={form.riskPercent}
                    onChange={e => set('riskPercent', e.target.value)}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Buying Power Dompet: <span style={blurStyle}>{formatMoney(buyingPower)}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alasan Entry / Catatan</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Contoh: Buy on breakout, double bottom pattern..."
                    value={form.reason}
                    onChange={e => set('reason', e.target.value)}
                    style={{ minHeight: 42 }}
                  />
                </div>
              </div>

              {/* Position Preview */}
              {entry > 0 && sl > 0 && tp > 0 && (
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>📊 Preview Kalkulasi Posisi</h4>
                  <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Rasio Risk:Reward</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: rrRatio >= 2 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        1 : {rrRatio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Maks. Resiko ({form.riskPercent}%)</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-red)', ...blurStyle }}>
                        {formatMoney(riskAmount)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Rekomendasi Qty</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {calculatedLots.toFixed(2)} {isUS ? 'Shares' : 'Lots'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Kebutuhan Modal</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', ...blurStyle }}>
                        {formatMoney(requiredCapital)}
                      </div>
                    </div>
                  </div>
                  {requiredCapital > buyingPower && (
                    <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: 10, fontWeight: 500 }}>
                      ⚠️ Peringatan: Modal yang dibutuhkan melebihi Buying Power yang tersedia!
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary">💾 Simpan Rencana</button>
            </form>
          </div>
        </div>
      )}

      {/* Plan list */}
      {tradingPlans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Belum ada rencana trading</div>
          <div className="empty-state-desc">Rencanakan transaksi Anda terlebih dahulu untuk mengelola risiko secara disiplin.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pasar</th>
                <th>Entry Price</th>
                <th>Stop Loss</th>
                <th>Target Profit</th>
                <th>Risk:Reward</th>
                <th>Lots/Shares</th>
                <th>Kebutuhan Modal</th>
                <th>Catatan</th>
                <th style={{ width: 140 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tradingPlans.map((plan: any) => {
                const planIsUS = plan.market === 'US';
                const fMoney = planIsUS ? formatUSD : formatRupiah;
                return (
                  <tr key={plan.id}>
                    <td><strong>{plan.stockCode}</strong></td>
                    <td><span className={`badge ${planIsUS ? 'badge-blue' : 'badge-green'}`}>{plan.market || 'ID'}</span></td>
                    <td>{fMoney(plan.entryPrice)}</td>
                    <td className="text-loss">{fMoney(plan.stopLoss)}</td>
                    <td className="text-profit">{fMoney(plan.targetProfit)}</td>
                    <td style={{ fontWeight: 600 }}>1 : {plan.rrRatio}</td>
                    <td>{plan.lots} {planIsUS ? 'Sh' : 'Lt'}</td>
                    <td style={blurStyle}>{fMoney(plan.requiredCapital)}</td>
                    <td style={{ maxWidth: 180, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{plan.reason || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canWrite && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleConvert(plan)}
                            title="Konversi rencana ini ke transaksi nyata"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 26 }}
                          >
                            Buka Trade
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm text-loss"
                          onClick={async () => {
                            const isConfirmed = await confirm('Hapus rencana trading ini?', {
                              title: 'Hapus Rencana',
                              severity: 'danger',
                              confirmText: 'Hapus'
                            });
                            if (isConfirmed) {
                              deleteTradingPlan(plan.id);
                            }
                          }}
                          style={{ padding: '4px 6px', height: 26 }}
                        >
                          <Icons.Trash2 size={14} />
                        </button>
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
  );
}
