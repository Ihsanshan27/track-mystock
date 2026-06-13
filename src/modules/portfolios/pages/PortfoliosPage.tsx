import { useMemo, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatDate, formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import { calculatePortfolioAssetIdrEquivalent, calculatePortfolioAssetMetrics } from '@/modules/trades/calculations';
import MarketTabBar from '@/modules/shared/components/MarketTabBar';
import * as Icons from 'lucide-react';

function getPortfolioMetrics(portfolioId, trades, cashflows, dividends, settings, marketPrices) {
  const scopedTrades = trades.filter((item: any) => (item.portfolioId || 'default') === portfolioId);
  const scopedCashflows = cashflows.filter((item: any) => (item.portfolioId || 'default') === portfolioId);
  const scopedDividends = dividends.filter((item: any) => (item.portfolioId || 'default') === portfolioId);

  const idMetrics = calculatePortfolioAssetMetrics(
    scopedTrades,
    scopedCashflows,
    scopedDividends,
    portfolioId === 'default' ? settings.initialCapital : 0,
    marketPrices,
    'ID'
  );

  const usMetrics = calculatePortfolioAssetMetrics(
    scopedTrades,
    scopedCashflows,
    scopedDividends,
    portfolioId === 'default' ? (settings.initialCapitalUS ?? 1000) : 0,
    marketPrices,
    'US'
  );

  const hasUS =
    scopedTrades.some((item: any) => item.market === 'US') ||
    scopedCashflows.some((item: any) => item.market === 'US') ||
    scopedDividends.some((item: any) => item.market === 'US');

  return {
    idMetrics,
    usMetrics,
    hasUS,
    totalEquityIdrEquivalent: (idMetrics.realizedEquity || 0) + ((usMetrics.realizedEquity || 0) * (settings.usdToIdrRate ?? 16200)),
    totalAssetIdrEquivalent: calculatePortfolioAssetIdrEquivalent(idMetrics, usMetrics, settings.usdToIdrRate),
    hasFallback: idMetrics.hasMarketValueFallback || usMetrics.hasMarketValueFallback,
  };
}

export default function PortfoliosPage() {
  const {
    portfolios,
    activePortfolioId,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    settings,
    marketPrices,
    allTrades,
    allCashflows,
    allDividends,
  } = useData();
  const { confirm } = useDialog();
  const blurStyle = usePrivacyStyle();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [activeMarketTab, setActiveMarketTab] = useState<'ID' | 'US'>('ID');

  const portfolioMetrics = useMemo(() => {
    return portfolios.reduce((acc: Record<string, any>, portfolio: any) => {
      acc[portfolio.id] = getPortfolioMetrics(
        portfolio.id,
        allTrades,
        allCashflows,
        allDividends,
        settings,
        marketPrices
      );
      return acc;
    }, {});
  }, [allCashflows, allDividends, allTrades, marketPrices, portfolios, settings]);

  const activePortfolio = portfolios.find((item) => item.id === activePortfolioId) || portfolios[0];
  const activeMetrics = portfolioMetrics[activePortfolioId] || portfolioMetrics.default;
  const activeHeadlineEquity = activeMarketTab === 'US'
    ? (activeMetrics?.usMetrics?.realizedEquity || 0)
    : (activeMetrics?.idMetrics?.realizedEquity || 0);
  const totalAssetAllPortfolios = portfolios.reduce((sum, portfolio: any) => {
    const metrics = portfolioMetrics[portfolio.id];
    return sum + (activeMarketTab === 'US'
      ? (metrics?.usMetrics?.realizedEquity || 0)
      : (metrics?.idMetrics?.realizedEquity || 0));
  }, 0);
  const hasFallbackAcrossPortfolios = portfolios.some((portfolio: any) => portfolioMetrics[portfolio.id]?.hasFallback);
  const formatHeadlineMoney = activeMarketTab === 'US' ? formatUSD : formatRupiah;

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

  const handleDelete = async (id: string, name: string) => {
    if (id === 'default') return;
    const isConfirmed = await confirm(`PERINGATAN: Menghapus portofolio "${name}" akan menghapus seluruh data transaksi, kas, dan dividen di dalamnya secara permanen.\n\nApakah Anda yakin ingin menghapus?`, {
      title: 'Hapus Portofolio',
      severity: 'danger',
      confirmText: 'Hapus Permanen'
    });
    if (isConfirmed) {
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
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activePortfolio?.name || 'Portofolio Utama'}
        </h2>
        <div style={{ marginBottom: 16 }}>
          <MarketTabBar activeTab={activeMarketTab} onChange={(tab) => setActiveMarketTab(tab)} accentColor="var(--accent-green)" />
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Total Equity ({activeMarketTab === 'US' ? 'USD' : 'IDR'})
        </div>
        <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, ...blurStyle }}>
          {formatHeadlineMoney(activeHeadlineEquity)}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Mengikuti definisi dashboard: modal aktif + net cashflow + realized P/L + dividen.
        </div>
        {activeMetrics?.hasFallback ? (
          <div className="badge badge-yellow" style={{ marginBottom: 18, width: 'fit-content' }}>
            Sebagian nilai posisi masih memakai harga beli karena harga market belum tersedia.
          </div>
        ) : null}
        <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Buying Power</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 4, ...blurStyle }}>
              <div>IDR: {formatRupiah(activeMetrics?.idMetrics?.buyingPower || 0)}</div>
              {activeMetrics?.hasUS ? <div style={{ color: 'var(--accent-blue-light)' }}>USD: {formatUSD(activeMetrics?.usMetrics?.buyingPower || 0)}</div> : null}
            </div>
          </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nilai Investasi Terbuka</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, ...blurStyle }}>
              <div>IDR: {formatRupiah(activeMetrics?.idMetrics?.displayInvestedAmount || 0)}</div>
              {activeMetrics?.hasUS ? <div style={{ color: 'var(--accent-blue-light)' }}>USD: {formatUSD(activeMetrics?.usMetrics?.displayInvestedAmount || 0)}</div> : null}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Floating P/L Posisi Terbuka</div>
            <div className="font-mono" style={{ fontSize: '1.10rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 4, ...blurStyle }}>
              <div className={(activeMetrics?.idMetrics?.totalFloatingPnL || 0) >= 0 ? 'text-profit' : 'text-loss'}>
                IDR: {(activeMetrics?.idMetrics?.totalFloatingPnL || 0) >= 0 ? '+' : ''}{formatRupiah(activeMetrics?.idMetrics?.totalFloatingPnL || 0)}
              </div>
              {activeMetrics?.hasUS ? (
                <div className={(activeMetrics?.usMetrics?.totalFloatingPnL || 0) >= 0 ? 'text-profit' : 'text-loss'}>
                  USD: {(activeMetrics?.usMetrics?.totalFloatingPnL || 0) >= 0 ? '+' : ''}{formatUSD(activeMetrics?.usMetrics?.totalFloatingPnL || 0)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(59,130,246,0.18)' }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Total Equity Semua Dompet
            </div>
            <div className="font-mono" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--accent-blue)', ...blurStyle }}>
              {formatHeadlineMoney(totalAssetAllPortfolios)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Akumulasi seluruh dompet untuk market {activeMarketTab === 'US' ? 'Amerika' : 'Indonesia'} dengan definisi yang sama seperti dashboard.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="badge badge-blue">
              {portfolios.length} dompet terhitung
            </div>
            {hasFallbackAcrossPortfolios ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: 260, textAlign: 'right' }}>
                Sebagian posisi lintas dompet masih memakai harga beli karena harga market belum tersedia.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)' }}>Daftar Portofolio / Dompet Anda</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {portfolios.map((portfolio: any) => {
          const isActive = portfolio.id === activePortfolioId;
          const metrics = portfolioMetrics[portfolio.id];

          return (
            <div
              key={portfolio.id}
              className={`portfolio-card-item bento-card ${isActive ? 'portfolio-card-active' : ''}`}
              style={{
                border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{portfolio.name}</h4>
                    {isActive ? (
                      <span className="badge badge-green">Aktif</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => selectPortfolio(portfolio.id)}>
                        Gunakan
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', minHeight: '36px', lineHeight: 1.4 }}>
                    {portfolio.description || 'Tidak ada deskripsi.'}
                  </p>

                  <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid rgba(59,130,246,0.12)', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 4 }}>
                      Total Equity ({activeMarketTab === 'US' ? 'USD' : 'IDR'})
                    </div>
                    <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-blue)', ...blurStyle }}>
                      {formatHeadlineMoney(activeMarketTab === 'US' ? (metrics?.usMetrics?.realizedEquity || 0) : (metrics?.idMetrics?.realizedEquity || 0))}
                    </div>
                    {metrics?.hasFallback ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        Sebagian posisi masih dihitung memakai harga beli.
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Buying Power</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)', ...blurStyle }}>IDR: {formatRupiah(metrics?.idMetrics?.buyingPower || 0)}</div>
                      {metrics?.hasUS ? <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)', ...blurStyle }}>USD: {formatUSD(metrics?.usMetrics?.buyingPower || 0)}</div> : null}
                    </div>
                    <div style={{ background: 'rgba(148,163,184,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Floating P/L</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, ...blurStyle, color: (metrics?.idMetrics?.totalFloatingPnL || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        IDR: {(metrics?.idMetrics?.totalFloatingPnL || 0) >= 0 ? '+' : ''}{formatRupiah(metrics?.idMetrics?.totalFloatingPnL || 0)}
                      </div>
                      {metrics?.hasUS ? (
                        <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, ...blurStyle, color: (metrics?.usMetrics?.totalFloatingPnL || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          USD: {(metrics?.usMetrics?.totalFloatingPnL || 0) >= 0 ? '+' : ''}{formatUSD(metrics?.usMetrics?.totalFloatingPnL || 0)}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Investasi Terbuka</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', ...blurStyle }}>
                        IDR: {formatRupiah(metrics?.idMetrics?.displayInvestedAmount || 0)}
                      </div>
                      {metrics?.hasUS ? (
                        <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)', ...blurStyle }}>
                          USD: {formatUSD(metrics?.usMetrics?.displayInvestedAmount || 0)}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Dibuat pada: {formatDate(portfolio.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(portfolio)} title="Edit Nama/Deskripsi" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icons.Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  {portfolio.id !== 'default' ? (
                    <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => handleDelete(portfolio.id, portfolio.name)} title="Hapus Portofolio" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icons.Trash2 size={12} />
                      <span>Hapus</span>
                    </button>
                  ) : null}
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
