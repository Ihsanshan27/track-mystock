import { useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatUSD, formatDate } from '@/modules/shared/utils/formatters';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import * as Icons from 'lucide-react';

export default function PortfoliosPage() {
  const {
    portfolios,
    activePortfolioId,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    settings,
    trades: filteredTrades,
    cashflows: filteredCashflows,
    dividends: filteredDividends,
    allTrades,
    allCashflows,
    allDividends,
  } = useData();

  const activeStatsID = calculatePortfolioBalance(
    filteredTrades.filter((t: any) => t.market !== 'US'),
    filteredCashflows.filter((c: any) => c.market !== 'US'),
    filteredDividends.filter((d: any) => d.market !== 'US'),
    activePortfolioId === 'default' ? settings.initialCapital : 0
  );

  const activeStatsUS = calculatePortfolioBalance(
    filteredTrades.filter((t: any) => t.market === 'US'),
    filteredCashflows.filter((c: any) => c.market === 'US'),
    filteredDividends.filter((d: any) => d.market === 'US'),
    activePortfolioId === 'default' ? (settings.initialCapitalUS || 1000) : 0
  );

  const hasUS = filteredTrades.some((t: any) => t.market === 'US') || 
                filteredCashflows.some((c: any) => c.market === 'US') || 
                filteredDividends.some((d: any) => d.market === 'US');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addPortfolio(form.name.trim(), form.description.trim());
    setForm({ name: '', description: '' });
    setShowForm(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    if (editId) {
      updatePortfolio(editId, { name: editForm.name.trim(), description: editForm.description.trim() });
    }
    setEditId(null);
    setEditForm({ name: '', description: '' });
  };

  const handleDelete = (id: string, name: string) => {
    if (id === 'default') return;
    if (window.confirm(`PERINGATAN: Menghapus portofolio "${name}" akan menghapus seluruh data transaksi, kas, dan dividen di dalamnya secara permanen.\n\nApakah Anda yakin ingin menghapus?`)) {
      deletePortfolio(id);
    }
  };

  const startEdit = (portfolio: any) => {
    setEditId(portfolio.id);
    setEditForm({ name: portfolio.name, description: portfolio.description || '' });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Icons.Wallet size={28} style={{ color: 'var(--accent-green)' }} />
            <span>Dompet & Portofolio</span>
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Pecah dan kelola portofolio investasi Anda menjadi beberapa bagian
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showForm ? (
            <>
              <Icons.X size={16} />
              <span>Batal</span>
            </>
          ) : (
            <>
              <Icons.Plus size={16} />
              <span>Tambah Portofolio</span>
            </>
          )}
        </button>
      </div>

      {/* Add Portfolio Form */}
      {showForm && (
        <div className="bento-card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <h3 className="bento-card-title">Buat Portofolio Baru</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nama Portofolio *</label>
              <input
                className="form-input"
                placeholder="Misal: Portofolio Saham Swing, Portofolio Jangka Panjang"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi / Catatan</label>
              <textarea
                className="form-textarea"
                placeholder="Keterangan mengenai strategi atau tujuan portofolio ini"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ minHeight: 60 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Save size={16} />
              <span>Buat Portofolio</span>
            </button>
          </form>
        </div>
      )}

      {/* Edit Portfolio Form */}
      {editId && (
        <div className="bento-card" style={{ marginBottom: 24, border: '1px solid var(--accent-green)', animation: 'fadeInUp 0.3s ease' }}>
          <h3 className="bento-card-title">Edit Portofolio</h3>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Nama Portofolio *</label>
              <input
                className="form-input"
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi / Catatan</label>
              <textarea
                className="form-textarea"
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ minHeight: 60 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.Save size={16} />
                <span>Simpan Perubahan</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Active Portfolio Stats Summary Card - Liquid glassmorphism styled */}
      <div className="bento-card" style={{ 
        marginBottom: 32, 
        background: 'rgba(24, 24, 27, 0.4)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), var(--shadow-lg)',
        borderLeft: '4px solid var(--accent-green)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icons.CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Aktif Sekarang</span>
        </div>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {portfolios.find(p => p.id === activePortfolioId)?.name || 'Portofolio Utama'}
        </h2>
        <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Buying Power</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>IDR: {formatRupiah(activeStatsID.buyingPower)}</div>
              {hasUS && <div style={{ color: 'var(--accent-blue-light)' }}>USD: {formatUSD(activeStatsUS.buyingPower)}</div>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nilai Investasi Terbuka</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>IDR: {formatRupiah(activeStatsID.investedAmount)}</div>
              {hasUS && <div style={{ color: 'var(--accent-blue-light)' }}>USD: {formatUSD(activeStatsUS.investedAmount)}</div>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Realized P&L</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className={activeStatsID.realizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
                IDR: {activeStatsID.realizedPnL >= 0 ? '+' : ''}{formatRupiah(activeStatsID.realizedPnL)}
              </div>
              {hasUS && (
                <div className={activeStatsUS.realizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
                  USD: {activeStatsUS.realizedPnL >= 0 ? '+' : ''}{formatUSD(activeStatsUS.realizedPnL)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolios List */}
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)' }}>Daftar Portofolio / Dompet Anda</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {portfolios.map(p => {
          const isActive = p.id === activePortfolioId;
          return (
            <div
              key={p.id}
              className={`portfolio-card-item bento-card ${isActive ? 'portfolio-card-active' : ''}`}
              style={{
                border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{p.name}</h4>
                    {isActive ? (
                      <span className="badge badge-green">Aktif</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => selectPortfolio(p.id)}>
                        Gunakan
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', minHeight: '36px', lineHeight: 1.4 }}>
                    {p.description || 'Tidak ada deskripsi.'}
                  </p>

                  {/* Per-portfolio stats */}
                  {(() => {
                    const pTrades = allTrades.filter((t: any) => (t.portfolioId || 'default') === p.id);
                    const pCashflows = allCashflows.filter((c: any) => (c.portfolioId || 'default') === p.id);
                    const pDividends = allDividends.filter((d: any) => (d.portfolioId || 'default') === p.id);
                    
                    const initialCapID = p.id === 'default' ? settings.initialCapital : 0;
                    const initialCapUS = p.id === 'default' ? (settings.initialCapitalUS || 1000) : 0;
                    
                    const statsID = calculatePortfolioBalance(
                      pTrades.filter((t: any) => t.market !== 'US'),
                      pCashflows.filter((c: any) => c.market !== 'US'),
                      pDividends.filter((d: any) => d.market !== 'US'),
                      initialCapID
                    );
                    const statsUS = calculatePortfolioBalance(
                      pTrades.filter((t: any) => t.market === 'US'),
                      pCashflows.filter((c: any) => c.market === 'US'),
                      pDividends.filter((d: any) => d.market === 'US'),
                      initialCapUS
                    );

                    const pHasUS = pTrades.some((t: any) => t.market === 'US') || 
                                   pCashflows.some((c: any) => c.market === 'US') || 
                                   pDividends.some((d: any) => d.market === 'US');

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Buying Power</div>
                          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)' }}>IDR: {formatRupiah(statsID.buyingPower)}</div>
                          {pHasUS && <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)' }}>USD: {formatUSD(statsUS.buyingPower)}</div>}
                        </div>
                        <div style={{ background: statsID.realizedPnL >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: `1px solid ${statsID.realizedPnL >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Realized P&L</div>
                          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: statsID.realizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            IDR: {statsID.realizedPnL >= 0 ? '+' : ''}{formatRupiah(statsID.realizedPnL)}
                          </div>
                          {pHasUS && (
                            <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: statsUS.realizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              USD: {statsUS.realizedPnL >= 0 ? '+' : ''}{formatUSD(statsUS.realizedPnL)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Dibuat pada: {formatDate(p.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)} title="Edit Nama/Deskripsi" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icons.Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  {p.id !== 'default' && (
                    <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => handleDelete(p.id, p.name)} title="Hapus Portofolio" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icons.Trash2 size={12} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .portfolio-card-item {
          transition: all var(--transition-fast) !important;
        }
        .portfolio-card-item:active {
          transform: scale(0.98) !important;
        }
        .portfolio-card-active {
          transform: translateY(-2px);
        }
        .btn-danger-text {
          color: var(--accent-red) !important;
        }
        .btn-danger-text:hover {
          background: var(--accent-red-dim) !important;
        }
      `}</style>
    </div>
  );
}
