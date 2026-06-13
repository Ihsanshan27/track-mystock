import { useState, useMemo, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatRupiah } from '@/modules/shared/utils/formatters';
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
  const { ipoEvents, ipoEntries, addIpoEntry, updateIpoEntry, deleteIpoEntry, updateIpoEvent, canWrite } = useData();
  const { alert, confirm } = useDialog();
  const blurStyle = usePrivacyStyle();

  const DRAFT_KEY = `ipo_detail_form_${id}`;
  const OPEN_KEY = `ipo_detail_open_${id}`;
  const EDIT_KEY = `ipo_detail_edit_${id}`;

  const [editId, setEditId] = useState<string | null>(
    () => sessionStorage.getItem(EDIT_KEY) || null
  );
  const [copySuccess, setCopySuccess] = useState(false);

  const [showForm, setShowFormState] = useState<boolean>(
    () => sessionStorage.getItem(OPEN_KEY) === 'true'
  );
  const [form, setFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });

  const setShowForm = (v: boolean) => {
    setShowFormState(v);
    if (v) sessionStorage.setItem(OPEN_KEY, 'true');
    else sessionStorage.removeItem(OPEN_KEY);
  };

  const setEditDraftId = (nextEditId: string | null) => {
    setEditId(nextEditId);
    if (nextEditId) sessionStorage.setItem(EDIT_KEY, nextEditId);
    else sessionStorage.removeItem(EDIT_KEY);
  };

  const set = (k: string, v: string) => setFormState((prev: typeof EMPTY_FORM) => {
    const next = { ...prev, [k]: v };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const setSellPrice = (value: string) => setFormState((prev: typeof EMPTY_FORM) => {
    const next = {
      ...prev,
      sellPrice: value,
      action: parseFloat(value) > 0 ? 'SELL' : prev.action,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const setAction = (value: 'SELL' | 'KEEP') => setFormState((prev: typeof EMPTY_FORM) => {
    const next = {
      ...prev,
      action: value,
      sellPrice: value === 'KEEP' ? '' : prev.sellPrice,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(OPEN_KEY);
    sessionStorage.removeItem(EDIT_KEY);
    setFormState(EMPTY_FORM);
    setShowFormState(false);
    setEditId(null);
  };

  const event = ipoEvents.find((e: any) => e.id === id);

  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    stockCode: '',
    ipoDate: '',
    offeringPrice: '',
    notes: '',
  });

  const handleOpenEditEvent = () => {
    if (event) {
      setEventForm({
        stockCode: event.stockCode,
        ipoDate: event.ipoDate,
        offeringPrice: String(event.offeringPrice),
        notes: event.notes || ''
      });
      setShowEditEventModal(true);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.stockCode || !eventForm.ipoDate || !eventForm.offeringPrice) {
      await alert('Mohon isi semua field wajib.', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }
    updateIpoEvent(id, {
      stockCode: eventForm.stockCode.toUpperCase(),
      ipoDate: eventForm.ipoDate,
      offeringPrice: parseFloat(eventForm.offeringPrice) || 0,
      notes: eventForm.notes
    });
    setShowEditEventModal(false);
  };

  const entries: IpoEntryCalc[] = useMemo(() => {
    return ipoEntries
      .filter((e: any) => e.ipoEventId === id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e: any, idx: number) => calcEntry({ ...e, no: idx + 1 }));
  }, [ipoEntries, id]);

  const summary = useMemo(() => {
    const sellEntries = entries.filter(e => e.action === 'SELL');
    const totalCapital = entries.reduce((s, e) => s + e.totalBuy, 0);
    const totalReturn = sellEntries.reduce((s, e) => s + e.profitRp, 0);
    const totalSellValue = sellEntries.reduce((s, e) => s + e.totalSell, 0);
    const avgReturnPct = totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0;
    return { totalCapital, totalReturn, totalSellValue, avgReturnPct, totalAccounts: entries.length };
  }, [entries]);

  const resetForm = () => clearDraft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName || !form.buyPrice || !form.lots) {
      await alert('Nama akun, harga beli, dan lot wajib diisi.', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
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
    setEditDraftId(entry.id);
    sessionStorage.removeItem(OPEN_KEY);
    setShowFormState(false);
  };

  const handleToggleForm = () => {
    if (showForm || editId) {
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

  const previewLots = parseFloat(form.lots) || 0;
  const previewBuy = parseFloat(form.buyPrice) || 0;
  const previewSell = parseFloat(form.sellPrice) || 0;
  const previewTotalBuy = previewBuy * previewLots * 100;
  const previewTotalSell = form.action === 'SELL' && previewSell > 0 ? previewSell * previewLots * 100 : 0;
  const previewProfit = previewTotalSell - previewTotalBuy;
  const previewPct = previewTotalBuy > 0 && previewTotalSell > 0 ? (previewProfit / previewTotalBuy) * 100 : 0;
  const compactCellStyle = { padding: '10px 8px', fontSize: '0.8rem', verticalAlign: 'middle' } as const;
  const compactHeaderStyle = { padding: '10px 8px', fontSize: '0.68rem' } as const;

  const renderEntryForm = (submitLabel: string, submitIcon: ReactNode, isInline = false) => (
    <form onSubmit={handleSubmit}>
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
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <div className="form-group">
          <label className="form-label">Harga Beli (Rp) *</label>
          <input type="number" step="any" className="form-input" placeholder={String(event?.offeringPrice || '')} value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Total Lot *</label>
          <input type="number" step="any" min="0" className="form-input" placeholder="1" value={form.lots} onChange={e => set('lots', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Jual AVG (Rp)</label>
          <input type="number" step="any" min="0" className="form-input" placeholder="0 jika KEEP" value={form.sellPrice} onChange={e => setSellPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">SL / TL</label>
          <select className="form-select" value={form.slTl} onChange={e => set('slTl', e.target.value)}>
            {SLTL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Aksi</label>
          <select className="form-select" value={form.action} onChange={e => setAction(e.target.value as 'SELL' | 'KEEP')}>
            {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Catatan</label>
          <input className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

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
              <div style={{ fontWeight: 700, color: 'var(--accent-yellow)' }}>KEEP - belum dijual</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary">
          {submitIcon}
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={resetForm}>
          <Icons.X size={15} /> Batal
        </button>
        {isInline && (
          <span style={{ alignSelf: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sedang mengedit entry akun ini
          </span>
        )}
      </div>
    </form>
  );

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
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
            {canWrite && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}
                onClick={handleOpenEditEvent}
                title="Edit Detail IPO (Kode/Harga/Tanggal)"
              >
                <Icons.Edit3 size={13} /> Edit Detail
              </button>
            )}
          </h1>
          <p className="page-subtitle">
            Harga Penawaran: <strong>{formatRupiah(event.offeringPrice)}</strong>
            &nbsp;·&nbsp; Tanggal IPO: <strong>{new Date(event.ipoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            {event.notes && <>&nbsp;·&nbsp; {event.notes}</>}
          </p>
        </div>
        {canWrite && (
          <button
            className={`btn ${showForm || editId ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleForm}
          >
            {showForm || editId ? <><Icons.X size={16} /> Batal</> : <><Icons.Plus size={16} /> Tambah Akun</>}
          </button>
        )}
      </div>

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

      {showForm && !editId && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--accent-green)' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Icons.UserPlus size={15} /> Tambah Akun Baru
            </h3>
          </div>
          <div className="card-body">
            {renderEntryForm(' Tambah Entry', <><Icons.Plus size={15} /></>)}
          </div>
        </div>
      )}

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
            <table className="table" style={{ width: '100%', minWidth: 920, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...compactHeaderStyle, width: 36 }}>No</th>
                  <th style={{ ...compactHeaderStyle, width: 58 }}>Saham</th>
                  <th style={{ ...compactHeaderStyle, width: 90 }}>Harga Beli</th>
                  <th style={{ ...compactHeaderStyle, width: 64 }}>Lot</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>Total Beli</th>
                  <th style={{ ...compactHeaderStyle, width: 88 }}>Jual AVG</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>Total Jual</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>Profit</th>
                  <th style={{ ...compactHeaderStyle, width: 70 }}>Profit %</th>
                  <th style={{ ...compactHeaderStyle, width: 110 }}>Akun</th>
                  <th style={{ ...compactHeaderStyle, width: 140 }}>Email</th>
                  <th style={{ ...compactHeaderStyle, width: 54 }}>SL/TL</th>
                  <th style={{ ...compactHeaderStyle, width: 70 }}>Aksi</th>
                  {canWrite && <th style={{ ...compactHeaderStyle, width: 72 }}>Tools</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const isProfit = entry.profitRp > 0;
                  const isLoss = entry.profitRp < 0;
                  const isKeep = entry.action === 'KEEP';
                  const isEditingThisRow = editId === entry.id;

                  return (
                    <>
                      <tr key={entry.id} style={{
                        background: isEditingThisRow
                          ? 'rgba(59, 130, 246, 0.08)'
                          : isKeep
                          ? 'rgba(234, 179, 8, 0.04)'
                          : isProfit
                          ? 'rgba(16, 185, 129, 0.04)'
                          : isLoss
                          ? 'rgba(239, 68, 68, 0.04)'
                          : undefined,
                        boxShadow: isEditingThisRow ? 'inset 3px 0 0 var(--accent-blue-light)' : undefined,
                      }}>
                        <td style={{ ...compactCellStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{entry.no}</td>
                        <td style={compactCellStyle}><strong>{event.stockCode}</strong></td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>{formatRupiah(entry.buyPrice)}</td>
                        <td className="font-mono" style={compactCellStyle}>{entry.lots} lot</td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>{formatRupiah(entry.totalBuy)}</td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>
                          {entry.action === 'SELL' && entry.sellPrice > 0 ? formatRupiah(entry.sellPrice) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>
                          {entry.totalSell > 0 ? formatRupiah(entry.totalSell) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ ...compactCellStyle, fontWeight: 600, ...blurStyle }}>
                          {entry.totalSell > 0 ? `${isProfit ? '+' : ''}${formatRupiah(entry.profitRp)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ ...compactCellStyle, fontWeight: 600 }}>
                          {entry.totalSell > 0 ? `${isProfit ? '+' : ''}${entry.profitPct.toFixed(2)}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ ...compactCellStyle, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.accountName}</td>
                        <td style={{ ...compactCellStyle, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.email || '—'}
                        </td>
                        <td style={compactCellStyle}>
                          <span style={{
                            fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                            background: entry.slTl === 'SL' ? 'var(--accent-red-dim)' : entry.slTl === 'TL' ? 'var(--accent-green-dim)' : 'var(--bg-input)',
                            color: entry.slTl === 'SL' ? 'var(--accent-red)' : entry.slTl === 'TL' ? 'var(--accent-green)' : 'var(--text-muted)',
                          }}>
                            {entry.slTl}
                          </span>
                        </td>
                        <td style={compactCellStyle}>
                          <span style={{
                            fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                            background: entry.action === 'SELL' ? 'var(--accent-blue-dim)' : 'rgba(234,179,8,0.15)',
                            color: entry.action === 'SELL' ? 'var(--accent-blue-light)' : '#d97706',
                          }}>
                            {entry.action}
                          </span>
                        </td>
                        {canWrite && (
                          <td style={compactCellStyle}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 5px', height: 24 }}
                                onClick={() => handleEdit(entry)}
                                title="Edit"
                              >
                                <Icons.Edit size={13} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 5px', height: 24, color: 'var(--accent-blue-light)' }}
                                onClick={() => handleDuplicate(entry)}
                                title="Duplikat entry ini"
                              >
                                <Icons.Copy size={13} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm text-loss"
                                style={{ padding: '2px 5px', height: 24 }}
                                onClick={async () => {
                                  const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus entry "${entry.accountName}"?`, {
                                    title: 'Hapus Entry Akun',
                                    severity: 'danger',
                                    confirmText: 'Hapus'
                                  });
                                  if (isConfirmed) {
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
                      {isEditingThisRow && canWrite && (
                        <tr>
                          <td colSpan={14} style={{ padding: 0, background: 'rgba(59, 130, 246, 0.04)' }}>
                            <div style={{ padding: 16, borderTop: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent-blue-light)' }}>
                                <Icons.Edit3 size={15} />
                                <strong>Edit Entry Akun Langsung Dari Tabel</strong>
                              </div>
                              {renderEntryForm(' Simpan Perubahan', <><Icons.Check size={15} /></>, true)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>

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

      {showEditEventModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ maxWidth: 500, width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0 }}>Edit Detail IPO Event</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditEventModal(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Kode Saham *</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: WBSA"
                    value={eventForm.stockCode}
                    onChange={e => setEventForm(prev => ({ ...prev, stockCode: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal IPO *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={eventForm.ipoDate}
                      onChange={e => setEventForm(prev => ({ ...prev, ipoDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Penawaran (Rp) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="Contoh: 100"
                      value={eventForm.offeringPrice}
                      onChange={e => setEventForm(prev => ({ ...prev, offeringPrice: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input
                    className="form-input"
                    placeholder="Catatan singkat tentang IPO ini..."
                    value={eventForm.notes}
                    onChange={e => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditEventModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Icons.Save size={15} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
