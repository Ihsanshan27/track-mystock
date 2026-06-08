import { useState, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { WATCHLIST_STATUS, WATCHLIST_PRIORITY } from '@/modules/shared/utils/constants';
import { formatRupiah, formatDate } from '@/modules/shared/utils/formatters';
import { Eye, Plus, X, Trash2, Save } from 'lucide-react';

export default function WatchlistPage() {
  const { watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem, watchlistFormDraft, setWatchlistFormDraft } = useData();

  const [showForm, setShowForm] = useState(() => {
    if (watchlistFormDraft) return watchlistFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (watchlistFormDraft) return watchlistFormDraft.form;
    return { stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium' };
  });

  useEffect(() => {
    setWatchlistFormDraft({ form, showForm });
  }, [form, showForm, setWatchlistFormDraft]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setForm({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium' });
      setWatchlistFormDraft(null);
    } else {
      setShowForm(true);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode) return;
    addWatchlistItem({
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      targetPrice: parseFloat(form.targetPrice) || null,
    });
    setForm({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium' });
    setShowForm(false);
    setWatchlistFormDraft(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus item dari watchlist?')) {
      deleteWatchlistItem(id);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateWatchlistItem(id, { status });
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Eye size={28} />
          </div>
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-subtitle">{watchlist.length} saham dipantau</p>
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
              Tambah Saham
            </span>
          )}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode Saham *</label>
                  <input
                    className="form-input"
                    placeholder="BBCA"
                    value={form.stockCode}
                    onChange={e => set('stockCode', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Harga Beli</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="8500"
                    value={form.targetPrice}
                    onChange={e => set('targetPrice', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prioritas</label>
                  <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    {WATCHLIST_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Alasan / Catatan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Kenapa saham ini menarik?"
                  value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  style={{ minHeight: 60 }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} />
                  Tambahkan
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <Eye size={48} />
          </div>
          <div className="empty-state-title">Watchlist kosong</div>
          <div className="empty-state-desc">Tambahkan saham yang ingin Anda pantau</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Target Harga</th>
                <th>Alasan</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(item => {
                const priority = WATCHLIST_PRIORITY.find(p => p.value === item.priority);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.stockCode}</strong></td>
                    <td>{item.targetPrice ? formatRupiah(item.targetPrice) : '-'}</td>
                    <td style={{ maxWidth: 250, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.reason || '-'}</td>
                    <td><span className={`badge badge-${priority?.color || 'blue'}`}>{priority?.label || item.priority}</span></td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: 130, padding: '4px 10px', fontSize: '0.8rem' }}
                        value={item.status}
                        onChange={e => handleStatusChange(item.id, e.target.value)}
                      >
                        {WATCHLIST_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(item.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(item.id)} aria-label="Hapus dari watchlist">
                        <Trash2 size={14} />
                      </button>
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
