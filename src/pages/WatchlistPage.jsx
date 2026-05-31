import { useState } from 'react';
import { useData } from '../context/DataContext';
import { WATCHLIST_STATUS, WATCHLIST_PRIORITY } from '../utils/constants';
import { formatRupiah, formatDate } from '../utils/formatters';

export default function WatchlistPage() {
  const { watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium' });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.stockCode) return;
    addWatchlistItem({
      ...form,
      stockCode: form.stockCode.toUpperCase(),
      targetPrice: parseFloat(form.targetPrice) || null,
    });
    setForm({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus item dari watchlist?')) deleteWatchlistItem(id);
  };

  const handleStatusChange = (id, status) => {
    updateWatchlistItem(id, { status });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👀 Watchlist</h1>
          <p className="page-subtitle">{watchlist.length} saham dipantau</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Batal' : '➕ Tambah Saham'}
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
                  <input className="form-input" placeholder="BBCA" value={form.stockCode} onChange={e => set('stockCode', e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Harga Beli</label>
                  <input type="number" className="form-input" placeholder="8500" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} />
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
                <textarea className="form-textarea" placeholder="Kenapa saham ini menarik?" value={form.reason} onChange={e => set('reason', e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <button type="submit" className="btn btn-primary">💾 Tambahkan</button>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👀</div>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)}>🗑</button>
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
