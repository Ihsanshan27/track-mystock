import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatRupiah, formatDate } from '@/modules/shared/utils/formatters';
import type { IpoEvent, IpoSummary } from '@/modules/ipo/types/ipo';
import * as Icons from 'lucide-react';

const DRAFT_KEY = 'ipo_list_form_draft';
const DRAFT_OPEN_KEY = 'ipo_list_form_open';
const EDIT_EVENT_KEY = 'ipo_list_edit_event_id';

const EMPTY_FORM = { stockCode: '', offeringDate: '', ipoDate: '', offeringPrice: '', notes: '' };

export default function IpoListPage() {
  const { ipoEvents, ipoEntries, addIpoEvent, updateIpoEvent, addIpoEntry, batchAddIpoEntries, deleteIpoEvent, canWrite } = useData();
  const navigate = useNavigate();
  const blurStyle = usePrivacyStyle();
  const { alert, confirm } = useDialog();

  const [editingEventId, setEditingEventId] = useState<string | null>(
    () => sessionStorage.getItem(EDIT_EVENT_KEY) || null
  );
  const editingEvent = editingEventId
    ? ipoEvents.find((event: IpoEvent) => event.id === editingEventId) || null
    : null;

  // Persist form state across navigation using sessionStorage
  const [showForm, setShowFormState] = useState<boolean>(
    () => sessionStorage.getItem(DRAFT_OPEN_KEY) === 'true'
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
    sessionStorage.setItem(DRAFT_OPEN_KEY, String(v));
  };

  const setEditingEvent = (eventId: string | null) => {
    setEditingEventId(eventId);
    if (eventId) sessionStorage.setItem(EDIT_EVENT_KEY, eventId);
    else sessionStorage.removeItem(EDIT_EVENT_KEY);
  };

  const set = (k: string, v: string) => setFormState(prev => {
    const next = { ...prev, [k]: v };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_OPEN_KEY);
    sessionStorage.removeItem(EDIT_EVENT_KEY);
    setFormState(EMPTY_FORM);
    setShowFormState(false);
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    clearDraft();
    setShowForm(true);
  };

  const handleOpenEdit = (event: IpoEvent) => {
    const nextForm = {
      stockCode: event.stockCode,
      offeringDate: event.offeringDate || '',
      ipoDate: event.ipoDate,
      offeringPrice: String(event.offeringPrice),
      notes: event.notes || '',
    };
    setEditingEvent(event.id);
    setFormState(nextForm);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextForm));
    sessionStorage.removeItem(DRAFT_OPEN_KEY);
    setShowFormState(false);
  };

  const handleCancel = () => {
    clearDraft();
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode || !form.ipoDate || !form.offeringPrice) {
      await alert('Mohon isi semua field yang wajib.', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }
    const payload = {
      stockCode: form.stockCode.toUpperCase(),
      offeringDate: form.offeringDate || undefined,
      ipoDate: form.ipoDate,
      offeringPrice: parseFloat(form.offeringPrice) || 0,
      notes: form.notes,
    };

    if (editingEvent) {
      updateIpoEvent(editingEvent.id, payload);
      clearDraft();
      setEditingEvent(null);
      setShowForm(false);
    } else {
      const newEvent = addIpoEvent(payload);
      clearDraft();
      if (newEvent?.id) navigate(`/ipo/${newEvent.id}`);
    }
  };

  // Duplicate an entire IPO event + all its entries
  const handleDuplicateEvent = (event: IpoEvent) => {
    const newEvent = addIpoEvent({
      stockCode: `${event.stockCode}`,
      offeringDate: event.offeringDate,
      ipoDate: event.ipoDate,
      offeringPrice: event.offeringPrice,
      notes: event.notes ? `${event.notes} (Kopi)` : '(Kopi)',
    });
    if (!newEvent?.id) return;
    const originalEntries = ipoEntries
      .filter((e: any) => e.ipoEventId === event.id)
      .map((e: any) => ({
        ipoEventId: newEvent.id,
        accountName: e.accountName,
        email: e.email,
        buyPrice: e.buyPrice,
        lots: e.lots,
        sellPrice: e.sellPrice,
        slTl: e.slTl,
        action: e.action,
        notes: e.notes,
      }));
    if (originalEntries.length > 0) {
      batchAddIpoEntries(originalEntries);
    }
    navigate(`/ipo/${newEvent.id}`);
  };

  const getSummary = (eventId: string): IpoSummary => {
    const entries = ipoEntries.filter((e: any) => e.ipoEventId === eventId);
    let totalCapital = 0, totalReturn = 0, sellCount = 0, keepCount = 0;
    entries.forEach((e: any) => {
      const shares = e.lots * 100;
      const buy = e.buyPrice * shares;
      const sell = e.sellPrice > 0 ? e.sellPrice * shares : buy;
      const profit = e.action === 'SELL' ? sell - buy : 0;
      totalCapital += buy;
      totalReturn += profit;
      if (e.action === 'SELL') sellCount++;
      else keepCount++;
    });
    return {
      totalCapital,
      totalReturn,
      avgReturnPct: totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0,
      accountCount: entries.length,
      sellCount,
      keepCount,
    };
  };

  const sorted = [...ipoEvents].sort(
    (a: IpoEvent, b: IpoEvent) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderEventForm = (submitLabel: string, submitIcon: ReactNode) => (
    <form onSubmit={handleSubmit}>
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <div className="form-group">
          <label className="form-label">Kode Saham *</label>
          <input
            className="form-input"
            placeholder="Contoh: WBSA"
            value={form.stockCode}
            onChange={e => set('stockCode', e.target.value.toUpperCase())}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal Penawaran</label>
          <input
            type="date"
            className="form-input"
            value={form.offeringDate}
            onChange={e => set('offeringDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal IPO *</label>
          <input
            type="date"
            className="form-input"
            value={form.ipoDate}
            onChange={e => set('ipoDate', e.target.value)}
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
            value={form.offeringPrice}
            onChange={e => set('offeringPrice', e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Catatan</label>
        <input
          className="form-input"
          placeholder="Catatan singkat tentang IPO ini..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary">
          {submitIcon}
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
          <Icons.X size={15} />
          Batal
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Rocket size={26} style={{ color: 'var(--accent-green)' }} />
            IPO Journey
          </h1>
          <p className="page-subtitle">Lacak partisipasi IPO dari berbagai akun dalam satu tempat</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ipo/summary')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.BarChart3 size={16} />
            Ringkasan IPO
          </button>
          {canWrite && (
            <button className="btn btn-primary" onClick={() => {
              if (showForm || editingEvent) {
                handleCancel();
              } else {
                handleOpenAdd();
              }
            }}>
              {showForm || editingEvent ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
              {showForm || editingEvent ? 'Batal' : 'Buat IPO Baru'}
            </button>
          )}
        </div>
      </div>

      {showForm && !editingEvent && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Icons.PlusCircle size={16} style={{ color: 'var(--accent-green)' }} />
              Buat IPO Event Baru
            </h3>
          </div>
          <div className="card-body">
            {renderEventForm(' Buat & Mulai Catat', <Icons.Rocket size={15} />)}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Icons.Rocket size={48} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="empty-state-title">Belum ada IPO Journey</div>
          <div className="empty-state-desc">
            Buat IPO event pertama Anda untuk mulai mencatat partisipasi dari berbagai akun.
          </div>
          {canWrite && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleOpenAdd}>
              <Icons.Plus size={16} /> Buat IPO Pertama
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {sorted.map((event: IpoEvent) => {
            const summary = getSummary(event.id);
            const isProfit = summary.totalReturn >= 0;
            const hasEntries = summary.accountCount > 0;
            const isEditingThisCard = editingEvent?.id === event.id;

            return (
              <div
                key={event.id}
                className="bento-card"
                style={{
                  cursor: 'pointer',
                  borderLeft: hasEntries
                    ? `4px solid ${isProfit ? 'var(--accent-green)' : 'var(--accent-red)'}`
                    : '4px solid var(--border-color)',
                  boxShadow: isEditingThisCard ? '0 0 0 1px var(--accent-blue-light), 0 12px 30px rgba(59, 130, 246, 0.12)' : undefined,
                  background: isEditingThisCard ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.06), transparent 28%)' : undefined,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => navigate(`/ipo/${event.id}`)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: 'var(--accent-green-dim)',
                        color: 'var(--accent-green)',
                        padding: '2px 10px',
                        borderRadius: 999,
                        fontWeight: 800,
                        fontSize: '1rem',
                        letterSpacing: '0.05em',
                      }}>
                        {event.stockCode}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>IPO</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {event.offeringDate ? `Penawaran: ${formatDate(event.offeringDate)} · ` : ''}
                      IPO: {formatDate(event.ipoDate)} &nbsp;·&nbsp; Harga: <strong>{formatRupiah(event.offeringPrice)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    {canWrite && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 6px', height: 28, color: 'var(--accent-blue-light)' }}
                          onClick={() => handleOpenEdit(event)}
                          title="Edit IPO"
                        >
                          <Icons.Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 6px', height: 28, color: 'var(--accent-blue-light)' }}
                          onClick={() => handleDuplicateEvent(event)}
                          title="Duplikat IPO ini (salin semua akun)"
                        >
                          <Icons.Copy size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 6px', height: 28, color: 'var(--accent-red)' }}
                          onClick={async () => {
                            const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus IPO ${event.stockCode}? Semua catatan akun dalam IPO ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`, {
                              title: 'Hapus IPO Event',
                              severity: 'danger',
                              confirmText: 'Hapus'
                            });
                            if (isConfirmed) {
                              deleteIpoEvent(event.id);
                            }
                          }}
                          title="Hapus IPO"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {hasEntries ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      Total Profit / Loss
                    </div>
                    <div
                      className={`font-mono ${isProfit ? 'text-profit' : 'text-loss'}`}
                      style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em', ...blurStyle }}
                    >
                      {isProfit ? '+' : ''}{formatRupiah(summary.totalReturn)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600, ...blurStyle }}>
                      {isProfit ? '+' : ''}{summary.avgReturnPct.toFixed(2)}% avg return
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Belum ada catatan akun - klik untuk mulai mengisi
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{summary.accountCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Akun</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-green)' }}>{summary.sellCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sell</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-yellow)' }}>{summary.keepCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keep</div>
                  </div>
                  {hasEntries && (
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, ...blurStyle }}>{formatRupiah(summary.totalCapital).replace('Rp', '').trim()}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modal</div>
                    </div>
                  )}
                </div>

                {event.notes && (
                  <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                    📝 {event.notes}
                  </div>
                )}

                {isEditingThisCard && canWrite && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Icons.Edit3 size={15} style={{ color: 'var(--accent-blue-light)' }} />
                      <strong>Edit IPO Langsung Dari List</strong>
                    </div>
                    {renderEventForm(' Simpan Perubahan', <Icons.Save size={15} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
