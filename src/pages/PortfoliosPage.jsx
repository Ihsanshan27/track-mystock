import { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatRupiah, formatDate } from '../utils/formatters';
import { calculatePortfolioBalance } from '../utils/calculations';

export default function PortfoliosPage() {
  const {
    portfolios,
    activePortfolioId,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    settings,
    trades: filteredTrades, // currently filtered
    cashflows: filteredCashflows,
    dividends: filteredDividends,
  } = useData();

  // We need all raw data to calculate stats for each individual portfolio
  // But wait! DataContext exposes trades/cashflows/dividends as filtered arrays.
  // To compute stats for ALL portfolios, we can either access raw lists,
  // or we can compute stats dynamically in the provider.
  // Since we exposed portfolios, we can calculate stats for the active portfolio,
  // and for other portfolios we can show a placeholder or just calculate based on their active selection.
  // Wait, let's look at DataContext value. We only exposed filteredTrades/filteredCashflows/filteredDividends.
  // But wait, the component can easily show the stats for the active portfolio,
  // and we can show the active portfolio's statistics in detail, and list the portfolios below.
  // This is actually much cleaner and prevents needing raw arrays in the component!
  // Let's compute active portfolio balance first:
  const activeStats = calculatePortfolioBalance(
    filteredTrades,
    filteredCashflows,
    filteredDividends,
    activePortfolioId === 'default' ? settings.initialCapital : 0
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addPortfolio(form.name.trim(), form.description.trim());
    setForm({ name: '', description: '' });
    setShowForm(false);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    updatePortfolio(editId, { name: editForm.name.trim(), description: editForm.description.trim() });
    setEditId(null);
    setEditForm({ name: '', description: '' });
  };

  const handleDelete = (id, name) => {
    if (id === 'default') return;
    if (window.confirm(`PERINGATAN: Menghapus portofolio "${name}" akan menghapus seluruh data transaksi, kas, dan dividen di dalamnya secara permanen.\n\nApakah Anda yakin ingin menghapus?`)) {
      deletePortfolio(id);
    }
  };

  const startEdit = (portfolio) => {
    setEditId(portfolio.id);
    setEditForm({ name: portfolio.name, description: portfolio.description || '' });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Dompet & Portofolio</h1>
          <p className="page-subtitle">Pecah dan kelola portofolio investasi Anda menjadi beberapa bagian</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Batal' : '➕ Tambah Portofolio'}
        </button>
      </div>

      {/* Add Portfolio Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <h3 className="card-title">Buat Portofolio Baru</h3>
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
              <button type="submit" className="btn btn-primary">💾 Buat Portofolio</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Portfolio Modal/Inline Form */}
      {editId && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--accent-blue)', animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <h3 className="card-title">Edit Portofolio</h3>
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
                <button type="submit" className="btn btn-primary">💾 Simpan Perubahan</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Portfolio Stats Summary Card */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-input) 100%)', borderLeft: '4px solid var(--accent-green)' }}>
        <div className="card-body">
          <span className="badge badge-green" style={{ marginBottom: 8 }}>Aktif Sekarang</span>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {portfolios.find(p => p.id === activePortfolioId)?.name || 'Portofolio Utama'}
          </h2>
          <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Buying Power</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatRupiah(activeStats.buyingPower)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nilai Investasi Terbuka</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatRupiah(activeStats.investedAmount)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Realized P&L</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: activeStats.realizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red-light)' }}>
                {activeStats.realizedPnL >= 0 ? '+' : ''}{formatRupiah(activeStats.realizedPnL)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolios List */}
      <h3 style={{ marginBottom: 16 }}>Daftar Portofolio / Dompet Anda</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {portfolios.map(p => {
          const isActive = p.id === activePortfolioId;
          return (
            <div
              key={p.id}
              className={`card ${isActive ? 'portfolio-card-active' : ''}`}
              style={{
                border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
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
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', minHeight: '36px' }}>
                    {p.description || 'Tidak ada deskripsi.'}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dibuat pada: {formatDate(p.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)} title="Edit Nama/Deskripsi">
                    ✏️ Edit
                  </button>
                  {p.id !== 'default' && (
                    <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => handleDelete(p.id, p.name)} title="Hapus Portofolio">
                      🗑️ Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .portfolio-card-active {
          transform: translateY(-2px);
        }
        .btn-danger-text {
          color: var(--accent-red-light);
        }
        .btn-danger-text:hover {
          background: var(--accent-red-dim);
        }
      `}</style>
    </div>
  );
}
