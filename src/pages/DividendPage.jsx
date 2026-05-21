import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatRupiah, formatUSD, formatDate } from '../utils/formatters';

export default function DividendPage() {
  const { dividends, addDividend, deleteDividend, trades } = useData();
  const [activeTab, setActiveTab] = useState('ID'); // 'ID' or 'US'
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    stockCode: '',
    shareCount: '',
    dividendPerShare: '',
    cumDate: '',
    payDate: '',
    notes: ''
  });

  const isUS = activeTab === 'US';
  
  const portfolioStocks = useMemo(() => {
    const open = trades.filter(t => (!t.sellPrice || !t.dateSell) && (t.market === activeTab || (!t.market && activeTab === 'ID')));
    const grouped = {};
    open.forEach(t => {
      const shares = isUS ? t.lots : t.lots * 100;
      if (!grouped[t.stockCode]) grouped[t.stockCode] = 0;
      grouped[t.stockCode] += shares;
    });
    return Object.entries(grouped).map(([code, shares]) => ({ code, shares }));
  }, [trades, activeTab, isUS]);

  const filteredDividends = dividends.filter(d => d.market === activeTab || (!d.market && activeTab === 'ID'));
  const totalDividendValue = filteredDividends.reduce((s, d) => s + (d.totalAmount || 0), 0);
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSelectPortfolio = (e) => {
    const code = e.target.value;
    if (!code) return;
    const stock = portfolioStocks.find(s => s.code === code);
    if (stock) {
      setForm(prev => ({ ...prev, stockCode: stock.code, shareCount: stock.shares }));
    }
    // reset select to default after picking
    e.target.value = '';
  };

  const handleSubmit = (e) => {
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
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus rekam dividen ini?')) deleteDividend(id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Dividend Tracker</h1>
          <p className="page-subtitle">Pantau pasif income dari pembagian keuntungan saham Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Batal' : '➕ Catat Dividen'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`tab-btn ${activeTab === 'ID' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'ID' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'ID' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('ID'); setShowForm(false); }}
        >
          🇮🇩 Pasar Indonesia
        </button>
        <button 
          className={`tab-btn ${activeTab === 'US' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'US' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'US' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('US'); setShowForm(false); }}
        >
          🇺🇸 Pasar Amerika
        </button>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)' }}>📈</div>
          <div className="stat-card-label">Total Dividen Diterima ({isUS ? 'US' : 'ID'})</div>
          <div className="stat-card-value text-profit">{formatMoney(totalDividendValue)}</div>
          <div className="stat-card-change positive">Masuk ke Realized Equity</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>🧾</div>
          <div className="stat-card-label">Jumlah Catatan Dividen</div>
          <div className="stat-card-value">{filteredDividends.length} kali</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Catat Dividen {isUS ? '🇺🇸 Pasar US' : '🇮🇩 Pasar ID'}</h3>
              
              {portfolioStocks.length > 0 && (
                <select className="form-select" style={{ width: 'auto', minWidth: 200 }} onChange={handleSelectPortfolio} defaultValue="">
                  <option value="">⚡ Isi otomatis dari Portfolio...</option>
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
                  <input type="number" step="any" className="form-input" placeholder={isUS ? "1.5" : "1000"} value={form.shareCount} onChange={e => set('shareCount', e.target.value)} />
                  {!isUS && <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>1 lot = 100 lembar</div>}
                  {isUS && <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>Mendukung pecahan saham (fractional shares)</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Dividen per Lembar ({isUS ? '$' : 'Rp'}) *</label>
                  <input type="number" step="any" className="form-input" placeholder={isUS ? "0.25" : "42.5"} value={form.dividendPerShare} onChange={e => set('dividendPerShare', e.target.value)} />
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

              <button type="submit" className="btn btn-primary">💾 Simpan Catatan Dividen</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Penerimaan Dividen</h3></div>
        {filteredDividends.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">💰</div>
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
                {filteredDividends.sort((a,b) => new Date(b.payDate || b.createdAt) - new Date(a.payDate || a.createdAt)).map(div => (
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
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(div.id)}>🗑</button>
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
