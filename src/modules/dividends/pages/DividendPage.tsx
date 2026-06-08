import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatUSD, formatDate } from '@/modules/shared/utils/formatters';
import { Coins, Plus, X, Trash2, Save, TrendingUp, Sparkles } from 'lucide-react';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';

export default function DividendPage() {
  const { dividends, addDividend, deleteDividend, trades, dividendFormDraft, setDividendFormDraft } = useData();

  const [showForm, setShowForm] = useState(() => {
    if (dividendFormDraft) return dividendFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (dividendFormDraft) return dividendFormDraft.form;
    return {
      stockCode: '',
      shareCount: '',
      dividendPerShare: '',
      cumDate: '',
      payDate: '',
      notes: ''
    };
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (dividendFormDraft) return dividendFormDraft.activeTab;
    return 'ID';
  });

  useEffect(() => {
    setDividendFormDraft({ form, showForm, activeTab });
  }, [form, showForm, activeTab, setDividendFormDraft]);

  const isUS = activeTab === 'US';

  const portfolioStocks = useMemo(() => {
    const open = trades.filter((t: any) => (!t.sellPrice || !t.dateSell) && (t.market === activeTab || (!t.market && activeTab === 'ID')));
    const grouped: Record<string, number> = {};
    open.forEach((t: any) => {
      const shares = isUS ? t.lots : t.lots * 100;
      if (!grouped[t.stockCode]) grouped[t.stockCode] = 0;
      grouped[t.stockCode] += shares;
    });
    return Object.entries(grouped).map(([code, shares]) => ({ code, shares }));
  }, [trades, activeTab, isUS]);

  const filteredDividends = dividends.filter((d: any) => d.market === activeTab || (!d.market && activeTab === 'ID'));
  const totalDividendValue = filteredDividends.reduce((s: number, d: any) => s + (d.totalAmount || 0), 0);
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSelectPortfolio = (e: any) => {
    const code = e.target.value;
    if (!code) return;
    const stock = portfolioStocks.find(s => s.code === code);
    if (stock) {
      setForm(prev => ({ ...prev, stockCode: stock.code, shareCount: stock.shares.toString() }));
    }
    e.target.value = '';
  };

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setForm({ stockCode: '', shareCount: '', dividendPerShare: '', cumDate: '', payDate: '', notes: '' });
      setDividendFormDraft(null);
    } else {
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode || !form.shareCount || !form.dividendPerShare) return;

    const count = parseFloat(form.shareCount) || 0;
    const dps = parseFloat(form.dividendPerShare) || 0;
    const total = count * dps;

    addDividend({
      ...form,
      market: activeTab,
      stockCode: form.stockCode.toUpperCase(),
      shareCount: count,
      dividendPerShare: dps,
      totalAmount: total,
    });

    setForm({ stockCode: '', shareCount: '', dividendPerShare: '', cumDate: '', payDate: '', notes: '' });
    setShowForm(false);
    setDividendFormDraft(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus rekam dividen ini?')) {
      deleteDividend(id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Coins size={28} />
          </div>
          <div>
            <h1 className="page-title">Dividend Tracker</h1>
            <p className="page-subtitle">Pantau pasif income dari pembagian keuntungan saham Anda</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCancelOrToggle}>
          {showForm ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={16} />
              Batal
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Catat Dividen
            </span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button
          className={`tab-btn ${activeTab === 'ID' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'ID' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'ID' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('ID'); setShowForm(false); }}
        >
          Pasar Indonesia
        </button>
        <button
          className={`tab-btn ${activeTab === 'US' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'US' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'US' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('US'); setShowForm(false); }}
        >
          Pasar Amerika
        </button>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8 }}>
              <TrendingUp size={18} className="text-profit" />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Total Dividen Diterima ({isUS ? 'US' : 'ID'})</div>
          </div>
          <div className="stat-card-value text-profit" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatMoney(totalDividendValue)}</div>
          <div className="stat-card-change positive" style={{ fontSize: '0.85rem', marginTop: 4 }}>Masuk ke Realized Equity</div>
        </div>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8 }}>
              <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Jumlah Catatan Dividen</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredDividends.length} kali</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Catat Dividen {isUS ? 'Pasar US' : 'Pasar ID'}</h3>

              {portfolioStocks.length > 0 && (
                <select className="form-select" style={{ width: 'auto', minWidth: 200 }} onChange={handleSelectPortfolio} defaultValue="">
                  <option value="">Isi otomatis dari Portfolio...</option>
                  {portfolioStocks.map(s => (
                    <option key={s.code} value={s.code}>{s.code} ({s.shares.toLocaleString(isUS ? 'en-US' : 'id-ID')} lbr)</option>
                  ))}
                </select>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode Saham *</label>
                  <input className="form-input" placeholder={isUS ? "AAPL" : "BBCA"} value={form.stockCode} onChange={e => set('stockCode', e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Lembar Dimiliki *</label>
                  <CurrencyInput
                    placeholder={isUS ? '1.5' : '1.000'}
                    value={form.shareCount}
                    onChange={v => set('shareCount', v)}
                    allowDecimal={isUS}
                  />
                  {!isUS && <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>1 lot = 100 lembar</div>}
                  {isUS && <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>Mendukung pecahan saham (fractional shares)</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Dividen per Lembar ({isUS ? '$' : 'Rp'}) *</label>
                  <CurrencyInput
                    placeholder={isUS ? '0.25' : '42.5'}
                    value={form.dividendPerShare}
                    onChange={v => set('dividendPerShare', v)}
                    allowDecimal={true}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cum Date</label>
                  <input type="date" className="form-input" value={form.cumDate} onChange={e => set('cumDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pay Date (Tgl Cair)</label>
                  <input type="date" className="form-input" value={form.payDate} onChange={e => set('payDate', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <input className="form-input" placeholder="Dividen final, buat beli kopi" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>

              {parseFloat(form.shareCount) > 0 && parseFloat(form.dividendPerShare) > 0 && (
                <div className="calc-result" style={{ marginBottom: 16 }}>
                  <div className="calc-result-row">
                    <span className="calc-result-label">Estimasi Total Dividen Diterima</span>
                    <span className="calc-result-value big text-profit">
                      {formatMoney(parseFloat(form.shareCount) * parseFloat(form.dividendPerShare))}
                    </span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} />
                  Simpan Catatan Dividen
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Penerimaan Dividen</h3></div>
        {filteredDividends.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Coins size={48} />
            </div>
            <div className="empty-state-title">Belum ada rekam dividen</div>
            <div className="empty-state-desc">Catat setiap dividen yang Anda terima untuk membuktikan efektivitas passive income Anda!</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kode Saham</th>
                  <th>Lembar</th>
                  <th>Nilai / Lembar</th>
                  <th>Total Diterima</th>
                  <th>Cum Date</th>
                  <th>Pay Date</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDividends.sort((a: any, b: any) => new Date(b.payDate || b.createdAt).getTime() - new Date(a.payDate || a.createdAt).getTime()).map((div: any) => (
                  <tr key={div.id}>
                    <td><strong>{div.stockCode}</strong></td>
                    <td>{div.shareCount.toLocaleString(isUS ? 'en-US' : 'id-ID')}</td>
                    <td>{formatMoney(div.dividendPerShare)}</td>
                    <td style={{ fontWeight: 600 }} className="text-profit">
                      +{formatMoney(div.totalAmount)}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{div.cumDate ? formatDate(div.cumDate) : '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{div.payDate ? formatDate(div.payDate) : '-'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{div.notes || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(div.id)} aria-label="Hapus rekam dividen">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
