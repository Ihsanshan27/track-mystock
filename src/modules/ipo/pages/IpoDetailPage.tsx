import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatRupiah, formatPercent } from '@/modules/shared/utils/formatters';
import type { IpoEntry, IpoEntryCalc } from '@/modules/ipo/types/ipo';
import * as Icons from 'lucide-react';

const SLTL_OPTIONS = ['-', 'SL', 'TL'] as const;
const ACTION_OPTIONS = ['SELL', 'KEEP'] as const;

const EMPTY_FORM = {
  accountName: '',
  email: '',
  buyPrice: '',
  lots: '',
  sellPrice: '',
  slTl: '-' as '-' | 'SL' | 'TL',
  action: 'SELL' as 'SELL' | 'KEEP',
  notes: '',
};

function calcEntry(e: IpoEntry): IpoEntryCalc {
  const shares = e.lots * 100;
  const totalBuy = e.buyPrice * shares;
  const totalSell = e.action === 'SELL' && e.sellPrice > 0 ? e.sellPrice * shares : 0;
  const profitRp = totalSell > 0 ? totalSell - totalBuy : 0;
  const profitPct = totalBuy > 0 && totalSell > 0 ? (profitRp / totalBuy) * 100 : 0;
  return { ...e, totalBuy, totalSell, profitRp, profitPct };
}

export default function IpoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ipoEvents, ipoEntries, addIpoEntry, updateIpoEntry, deleteIpoEntry, canWrite } = useData();
  const blurStyle = usePrivacyStyle();

  // Session storage keys scoped per IPO event
  const DRAFT_KEY = `ipo_detail_form_${id}`;
  const OPEN_KEY = `ipo_detail_open_${id}`;

  const [editId, setEditId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [showForm, setShowFormState] = useState<boolean>(
    () => sessionStorage.getItem(OPEN_KEY) === 'true'
  );
  const [form, setFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : EMPTY_FORM;
    } catch { return EMPTY_FORM; }
  });

  const setShowForm = (v: boolean) => {
    setShowFormState(v);
    if (v) sessionStorage.setItem(OPEN_KEY, 'true');
    else sessionStorage.removeItem(OPEN_KEY);
  };

  const set = (k: string, v: any) => setFormState((prev: any) => {
    const next = { ...prev, [k]: v };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(OPEN_KEY);
    setFormState(EMPTY_FORM);
    setShowFormState(false);
    setEditId(null);
  };

  const event = ipoEvents.find((e: any) => e.id === id);

  const entries: IpoEntryCalc[] = useMemo(() => {
    return ipoEntries
      .filter((e: any) => e.ipoEventId === id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e: any, idx: number) => calcEntry({ ...e, no: idx + 1 }));
  }, [ipoEntries, id]);

  // Summary totals
  const summary = useMemo(() => {
    const sellEntries = entries.filter(e => e.action === 'SELL');
    const totalCapital = entries.reduce((s, e) => s + e.totalBuy, 0);
    const totalReturn = sellEntries.reduce((s, e) => s + e.profitRp, 0);
    const totalSellValue = sellEntries.reduce((s, e) => s + e.totalSell, 0);
    const avgReturnPct = totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0;
    return { totalCapital, totalReturn, totalSellValue, avgReturnPct, totalAccounts: entries.length };
  }, [entries]);

  const resetForm = () => clearDraft();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName || !form.buyPrice || !form.lots) {
      alert('Nama akun, harga beli, dan lot wajib diisi.');
      return;
    }
    const payload = {
      ipoEventId: id,
      accountName: form.accountName,
      email: form.email,
      buyPrice: parseFloat(form.buyPrice) || 0,
      lots: parseFloat(form.lots) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      slTl: form.slTl,
      action: form.action,
      notes: form.notes,
    };
    if (editId) {
      updateIpoEntry(editId, payload);
    } else {
      addIpoEntry(payload);
    }
    clearDraft();
  };

  const handleEdit = (entry: IpoEntryCalc) => {
    const draft = {
      accountName: entry.accountName,
      email: entry.email,
      buyPrice: String(entry.buyPrice),
      lots: String(entry.lots),
      sellPrice: String(entry.sellPrice || ''),
      slTl: entry.slTl,
      action: entry.action,
      notes: entry.notes || '',
    };
    setFormState(draft);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setEditId(entry.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle form open, reset to empty if opening fresh (not edit)
  const handleToggleForm = () => {
    if (showForm) {
      clearDraft();
    } else {
      setShowForm(true);
    }
  };

  const handleDuplicate = (entry: IpoEntryCalc) => {
    addIpoEntry({
      ipoEventId: id,
      accountName: `${entry.accountName} (Kopi)`,
      email: entry.email,
      buyPrice: entry.buyPrice,
      lots: entry.lots,
      sellPrice: entry.sellPrice,
      slTl: entry.slTl,
      action: entry.action,
      notes: entry.notes,
    });
  };

  const handleCopyTable = () => {
    const headers = [
      'No', 'Saham', 'Harga Beli', 'Total Lot', 'Total Harga (Rp)',
      'Harga Jual AVG', 'Total Harga Jual (Rp)', 'Profit (Rp)', 'Profit (%)',
      'Akun', 'Email (Google)', 'SL/TL', 'SELL/KEEP', 'Catatan'
    ];
    const rows = entries.map(e => [
      e.no,
      event?.stockCode || '',
      e.buyPrice,
      e.lots,
      e.totalBuy,
      e.action === 'SELL' && e.sellPrice > 0 ? e.sellPrice : '',
      e.totalSell > 0 ? e.totalSell : '',
      e.totalSell > 0 ? e.profitRp : '',
      e.totalSell > 0 ? `${e.profitPct.toFixed(2)}%` : '',
      e.accountName,
      e.email || '',
      e.slTl,
      e.action,
      e.notes || '',
    ]);
    const tsv = [headers, ...rows].map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Real-time preview in form
  const previewLots = parseFloat(form.lots) || 0;
  const previewBuy = parseFloat(form.buyPrice) || 0;
  const previewSell = parseFloat(form.sellPrice) || 0;
  const previewTotalBuy = previewBuy * previewLots * 100;
  const previewTotalSell = form.action === 'SELL' && previewSell > 0 ? previewSell * previewLots * 100 : 0;
  const previewProfit = previewTotalSell - previewTotalBuy;
  const previewPct = previewTotalBuy > 0 && previewTotalSell > 0 ? (previewProfit / previewTotalBuy) * 100 : 0;

  if (!event) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Icons.AlertTriangle size={48} style={{ color: 'var(--accent-red)' }} /></div>
        <div className="empty-state-title">IPO Event tidak ditemukan</div>
        <button className="btn btn-primary" onClick={() => navigate('/ipo')}>← Kembali</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/ipo')}
              style={{ padding: '4px 8px' }}
            >
              <Icons.ChevronLeft size={16} /> Daftar IPO
            </button>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'var(--accent-green-dim)',
              color: 'var(--accent-green)',
              padding: '2px 14px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: '1.4rem',
            }}>
              {event.stockCode}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>IPO Journey</span>
          </h1>
          <p className="page-subtitle">
            Harga Penawaran: <strong>{formatRupiah(event.offeringPrice)}</strong>
            &nbsp;·&nbsp; Tanggal IPO: <strong>{new Date(event.ipoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            {event.notes && <>&nbsp;·&nbsp; {event.notes}</>}
          </p>
        </div>
        {canWrite && (
          <button
            className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => handleToggleForm()}
          >
            {showForm ? <><Icons.X size={16} /> Batal</> : <><Icons.Plus size={16} /> Tambah Akun</>}
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'Total Modal', value: formatRupiah(summary.totalCapital),
            icon: Icons.Wallet, color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)', blur: true
          },
          {
            label: 'Total Profit/Loss', value: `${summary.totalReturn >= 0 ? '+' : ''}${formatRupiah(summary.totalReturn)}`,
            icon: summary.totalReturn >= 0 ? Icons.TrendingUp : Icons.TrendingDown,
            color: summary.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            dim: summary.totalReturn >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            valueColor: summary.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            blur: true,
          },
          {
            label: 'Avg Return', value: `${summary.avgReturnPct >= 0 ? '+' : ''}${summary.avgReturnPct.toFixed(2)}%`,
            icon: Icons.Percent,
            color: summary.avgReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            dim: summary.avgReturnPct >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            valueColor: summary.avgReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          },
          {
            label: 'Total Akun', value: String(summary.totalAccounts),
            icon: Icons.Users, color: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)'
          },
        ].map((stat, i) => {
          const Ic = stat.icon;
          return (
            <div key={i} className="bento-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: stat.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic size={14} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: (stat as any).valueColor || 'var(--text-primary)', ...(stat.blur ? blurStyle : {}) }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--accent-green)' }}>
          <div className="card-header">
            <h3 className="card-title">
              {editId ? <><Icons.Edit size={15} /> Edit Entry Akun</> : <><Icons.UserPlus size={15} /> Tambah Akun Baru</>}
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Row 1 */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Akun *</label>
                  <input className="form-input" placeholder="Akun Pribadi / Istri / dll" value={form.accountName} onChange={e => set('accountName', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Google)</label>
                  <input type="email" className="form-input" placeholder="email@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
              {/* Row 2 */}
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Harga Beli (Rp) *</label>
                  <input type="number" step="any" className="form-input" placeholder={String(event.offeringPrice)} value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Lot *</label>
                  <input type="number" step="any" min="0" className="form-input" placeholder="1" value={form.lots} onChange={e => set('lots', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Jual AVG (Rp)</label>
                  <input type="number" step="any" min="0" className="form-input" placeholder="0 jika KEEP" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SL / TL</label>
                  <select className="form-select" value={form.slTl} onChange={e => set('slTl', e.target.value)}>
                    {SLTL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 3 */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aksi</label>
                  <select className="form-select" value={form.action} onChange={e => set('action', e.target.value)}>
                    {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              {/* Live Preview */}
              {previewBuy > 0 && previewLots > 0 && (
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Harga Beli</div>
                    <div className="font-mono" style={{ fontWeight: 700, ...blurStyle }}>{formatRupiah(previewTotalBuy)}</div>
                  </div>
                  {form.action === 'SELL' && previewSell > 0 && (
                    <>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Harga Jual</div>
                        <div className="font-mono" style={{ fontWeight: 700, ...blurStyle }}>{formatRupiah(previewTotalSell)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Profit (Rp)</div>
                        <div className="font-mono" style={{ fontWeight: 700, color: previewProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', ...blurStyle }}>
                          {previewProfit >= 0 ? '+' : ''}{formatRupiah(previewProfit)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Profit (%)</div>
                        <div className="font-mono" style={{ fontWeight: 700, color: previewPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {previewPct >= 0 ? '+' : ''}{previewPct.toFixed(2)}%
                        </div>
                      </div>
                    </>
                  )}
                  {form.action === 'KEEP' && (
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Status</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-yellow)' }}>📌 KEEP — belum dijual</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  {editId ? <><Icons.Check size={15} /> Simpan Perubahan</> : <><Icons.Plus size={15} /> Tambah Entry</>}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entries Table */}
      {entries.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-state-icon"><Icons.Users size={40} style={{ color: 'var(--text-muted)' }} /></div>
          <div className="empty-state-title">Belum ada catatan akun</div>
          <div className="empty-state-desc">Tambahkan akun-akun yang berpartisipasi dalam IPO {event.stockCode} ini.</div>
          {canWrite && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>
              <Icons.Plus size={16} /> Tambah Akun
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Catatan Per Akun</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{entries.length} akun terdaftar</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyTable}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, fontSize: '0.78rem' }}
                title="Copy semua data ke clipboard (paste ke Excel/Sheets)"
              >
                {copySuccess
                  ? <><Icons.Check size={13} style={{ color: 'var(--accent-green)' }} /> Tersalin!</>
                  : <><Icons.Clipboard size={13} /> Copy Tabel</>}
              </button>
            </div>
          </div>
          <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>No</th>
                  <th>Saham</th>
                  <th>Harga Beli</th>
                  <th>Total Lot</th>
                  <th>Total Harga</th>
                  <th>Harga Jual (AVG)</th>
                  <th>Total Harga Jual</th>
                  <th>Profit (Rp)</th>
                  <th>Profit (%)</th>
                  <th>Akun</th>
                  <th>Email</th>
                  <th style={{ width: 60 }}>SL/TL</th>
                  <th style={{ width: 80 }}>SELL/KEEP</th>
                  {canWrite && <th style={{ width: 80 }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const isProfit = entry.profitRp > 0;
                  const isLoss = entry.profitRp < 0;
                  const isKeep = entry.action === 'KEEP';
                  return (
                    <tr key={entry.id} style={{
                      background: isKeep
                        ? 'rgba(234, 179, 8, 0.04)'
                        : isProfit
                        ? 'rgba(16, 185, 129, 0.04)'
                        : isLoss
                        ? 'rgba(239, 68, 68, 0.04)'
                        : undefined,
                    }}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{entry.no}</td>
                      <td><strong>{event.stockCode}</strong></td>
                      <td className="font-mono" style={{ ...blurStyle }}>{formatRupiah(entry.buyPrice)}</td>
                      <td className="font-mono">{entry.lots} lot</td>
                      <td className="font-mono" style={{ ...blurStyle }}>{formatRupiah(entry.totalBuy)}</td>
                      <td className="font-mono" style={{ ...blurStyle }}>
                        {entry.action === 'SELL' && entry.sellPrice > 0 ? formatRupiah(entry.sellPrice) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="font-mono" style={{ ...blurStyle }}>
                        {entry.totalSell > 0 ? formatRupiah(entry.totalSell) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ fontWeight: 600, ...blurStyle }}>
                        {entry.totalSell > 0 ? `${isProfit ? '+' : ''}${formatRupiah(entry.profitRp)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ fontWeight: 600 }}>
                        {entry.totalSell > 0 ? `${isProfit ? '+' : ''}${entry.profitPct.toFixed(2)}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.accountName}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.email || '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                          background: entry.slTl === 'SL' ? 'var(--accent-red-dim)' : entry.slTl === 'TL' ? 'var(--accent-green-dim)' : 'var(--bg-input)',
                          color: entry.slTl === 'SL' ? 'var(--accent-red)' : entry.slTl === 'TL' ? 'var(--accent-green)' : 'var(--text-muted)',
                        }}>
                          {entry.slTl}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: entry.action === 'SELL' ? 'var(--accent-blue-dim)' : 'rgba(234,179,8,0.15)',
                          color: entry.action === 'SELL' ? 'var(--accent-blue-light)' : '#d97706',
                        }}>
                          {entry.action}
                        </span>
                      </td>
                      {canWrite && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '3px 6px', height: 26 }}
                              onClick={() => handleEdit(entry)}
                              title="Edit"
                            >
                              <Icons.Edit size={13} />
                            </button>
                             <button
                               className="btn btn-ghost btn-sm"
                               style={{ padding: '3px 6px', height: 26, color: 'var(--accent-blue-light)' }}
                               onClick={() => handleDuplicate(entry)}
                               title="Duplikat entry ini"
                             >
                               <Icons.Copy size={13} />
                             </button>
                            <button
                              className="btn btn-ghost btn-sm text-loss"
                              style={{ padding: '3px 6px', height: 26 }}
                              onClick={() => {
                                if (window.confirm(`Hapus entry "${entry.accountName}"?`)) {
                                  deleteIpoEntry(entry.id);
                                }
                              }}
                              title="Hapus"
                            >
                              <Icons.Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Row */}
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-input)' }}>
                  <td colSpan={4} style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '10px 12px' }}>
                    TOTAL ({entries.length} akun)
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, ...blurStyle }}>{formatRupiah(summary.totalCapital)}</td>
                  <td></td>
                  <td className="font-mono" style={{ fontWeight: 700, ...blurStyle }}>{formatRupiah(summary.totalSellValue)}</td>
                  <td className={`font-mono ${summary.totalReturn >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontWeight: 800, ...blurStyle }}>
                    {summary.totalReturn >= 0 ? '+' : ''}{formatRupiah(summary.totalReturn)}
                  </td>
                  <td className={`font-mono ${summary.avgReturnPct >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontWeight: 800 }}>
                    {summary.avgReturnPct >= 0 ? '+' : ''}{summary.avgReturnPct.toFixed(2)}%
                  </td>
                  <td colSpan={canWrite ? 5 : 4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
