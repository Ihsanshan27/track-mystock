import { Fragment, useState, useMemo, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatRupiah, formatDate } from '@/modules/shared/utils/formatters';
import type { IpoEntry, IpoEntryCalc } from '@/modules/ipo/types/ipo';
import { getIpoEventStatus, parseDateOnly } from '@/modules/ipo/utils/ipoStatus';
import * as Icons from 'lucide-react';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import '@/modules/ipo/ipo.css';

const SLTL_OPTIONS = ['-', 'SL', 'TL'] as const;
const ACTION_OPTIONS = ['SELL', 'KEEP'] as const;

const formatLongDate = (date?: string) => (
  date
    ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'
);

/** Hitung sisa hari menuju tanggal target */
function diffDaysFromToday(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = parseDateOnly(dateStr);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const EMPTY_FORM = {
  accountName: '',
  email: '',
  lots: '',
  sellPrice: '',
  slTl: '-' as '-' | 'SL' | 'TL',
  action: 'SELL' as 'SELL' | 'KEEP',
  notes: '',
};

const EMPTY_ENTRY_ERRORS = {
  lots: '',
  sellPrice: '',
  accountName: '',
};

type SortKey =
  | 'no'
  | 'stockCode'
  | 'buyPrice'
  | 'lots'
  | 'totalBuy'
  | 'sellPrice'
  | 'totalSell'
  | 'profitRp'
  | 'profitPct'
  | 'accountName'
  | 'email'
  | 'slTl'
  | 'action';

type SortDirection = 'asc' | 'desc';

function calcEntry(e: IpoEntry): IpoEntryCalc {
  const shares = e.lots * 100;
  const totalBuy = e.buyPrice * shares;
  const totalSell = e.sellPrice > 0 ? e.sellPrice * shares : 0;
  const profitRp = totalSell > 0 ? totalSell - totalBuy : 0;
  const profitPct = totalBuy > 0 && totalSell > 0 ? (profitRp / totalBuy) * 100 : 0;
  return { ...e, totalBuy, totalSell, profitRp, profitPct };
}

export default function IpoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ipoEvents, ipoEntries, ipoAccounts, addIpoEntry, updateIpoEntry, deleteIpoEntry, batchDeleteIpoEntries, batchUpdateIpoEntries, addTrade, showToast, settings, updateIpoEvent, defaultPortfolioId, canWrite } = useData();
  const { alert, confirm } = useDialog();
  const blurStyle = usePrivacyStyle();

  const event = ipoEvents.find((e: any) => e.id === id);

  const entries: IpoEntryCalc[] = useMemo(() => {
    return ipoEntries
      .filter((e: any) => e.ipoEventId === id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e: any, idx: number) => calcEntry({ ...e, no: idx + 1, buyPrice: event?.offeringPrice ?? e.buyPrice }));
  }, [event?.offeringPrice, ipoEntries, id]);

  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  const DRAFT_KEY = `ipo_detail_form_${id}`;
  const OPEN_KEY = `ipo_detail_open_${id}`;
  const EDIT_KEY = `ipo_detail_edit_${id}`;

  const [editId, setEditId] = useState<string | null>(
    () => sessionStorage.getItem(EDIT_KEY) || null
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [entryErrors, setEntryErrors] = useState(EMPTY_ENTRY_ERRORS);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'no',
    direction: 'asc',
  });

  const isAllEntriesSelected = entries.length > 0 && entries.every(e => selectedEntryIds.includes(e.id));

  const handleSelectAllEntries = () => {
    if (isAllEntriesSelected) {
      setSelectedEntryIds(prev => prev.filter(id => !entries.some(e => e.id === id)));
    } else {
      const newIds = entries.map(e => e.id).filter(id => !selectedEntryIds.includes(id));
      setSelectedEntryIds(prev => [...prev, ...newIds]);
    }
  };

  const handleBulkUpdateIpoAction = (action: 'SELL' | 'KEEP') => {
    batchUpdateIpoEntries(selectedEntryIds, { action });
    setSelectedEntryIds([]);
  };

  const handleBulkUpdateIpoSlTl = (slTl: 'SL' | 'TL' | '-') => {
    batchUpdateIpoEntries(selectedEntryIds, { slTl });
    setSelectedEntryIds([]);
  };

  const handleBulkDeleteIpoEntries = async () => {
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus ${selectedEntryIds.length} entri akun yang dipilih?`, {
      title: 'Hapus Entri Massal',
      severity: 'danger',
      confirmText: 'Hapus Semua'
    });
    if (isConfirmed) {
      batchDeleteIpoEntries(selectedEntryIds);
      setSelectedEntryIds([]);
    }
  };

  const handleBulkSyncIpoToJournal = () => {
    if (!event) return;
    const sellEntries = entries.filter(e => selectedEntryIds.includes(e.id) && e.action === 'SELL');
    if (sellEntries.length === 0) {
      alert('Hanya entri dengan Aksi SELL yang dapat disinkronkan ke Jurnal Saham.', {
        title: 'Tidak Ada Entri SELL',
        severity: 'warning'
      });
      return;
    }

    let count = 0;
    sellEntries.forEach(entry => {
      addTrade({
        assetType: 'stock',
        market: 'ID',
        stockCode: event.stockCode,
        dateBuy: event.ipoDate,
        dateSell: event.ipoDate,
        buyPrice: event.offeringPrice,
        sellPrice: entry.sellPrice,
        lots: entry.lots,
        buyFee: settings.defaultBuyFee || 0.15,
        sellFee: settings.defaultSellFee || 0.25,
        strategy: 'Value Investing',
        reasonEntry: `Sinkronisasi massal IPO dari akun: ${entry.accountName}`,
        reasonExit: `Auto-exit hari pertama listing`,
        emotion: 'calm',
        rating: 4,
        tags: ['ipo', entry.accountName.toLowerCase().replace(/\s+/g, '-')],
        notes: entry.notes || '',
        portfolioId: defaultPortfolioId,
      });
      count++;
    });
    showToast(`Berhasil menyinkronkan ${count} entri ke Jurnal Saham`);
    setSelectedEntryIds([]);
  };

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
  const knownIpoAccounts = useMemo(() => {
    return [...ipoAccounts].sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [ipoAccounts]);
  const ipoAccountByName = useMemo(() => {
    return new Map(
      knownIpoAccounts.map((account: any) => [account.name.trim().toLowerCase(), account])
    );
  }, [knownIpoAccounts]);
  const setAccountName = (value: string) => setFormState((prev: typeof EMPTY_FORM) => {
    const matchedAccount = ipoAccountByName.get(value.trim().toLowerCase());
    const next = {
      ...prev,
      accountName: value,
      email: matchedAccount?.email || prev.email,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });
  const setAccountEmail = (value: string) => setFormState((prev: typeof EMPTY_FORM) => {
    const next = {
      ...prev,
      email: value,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const setSellPrice = (value: string) => setFormState((prev: typeof EMPTY_FORM) => {
    const next = {
      ...prev,
      sellPrice: value,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  });

  const setAction = (value: 'SELL' | 'KEEP') => setFormState((prev: typeof EMPTY_FORM) => {
    const next = {
      ...prev,
      action: value,
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
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    stockCode: '',
    underwriter: '',
    offeringDate: '',
    ipoDate: '',
    offeringPrice: '',
    notes: '',
    sector: '',
    registrar: '',
    targetBoard: 'Utama',
    bookbuildingStartDate: '',
    bookbuildingEndDate: '',
    lotPoolingAmount: '',
    allotmentDate: '',
    refundDate: '',
    distributionDate: '',
  });

  const handleOpenEditEvent = () => {
    if (event) {
      setEventForm({
        stockCode: event.stockCode,
        underwriter: event.underwriter || '',
        offeringDate: event.offeringDate || '',
        ipoDate: event.ipoDate,
        offeringPrice: String(event.offeringPrice),
        notes: event.notes || '',
        sector: event.sector || '',
        registrar: event.registrar || '',
        targetBoard: event.targetBoard || 'Utama',
        bookbuildingStartDate: event.bookbuildingStartDate || '',
        bookbuildingEndDate: event.bookbuildingEndDate || '',
        lotPoolingAmount: event.lotPoolingAmount != null ? String(event.lotPoolingAmount) : '',
        allotmentDate: event.allotmentDate || '',
        refundDate: event.refundDate || '',
        distributionDate: event.distributionDate || '',
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
    if (eventForm.bookbuildingStartDate && eventForm.bookbuildingEndDate && eventForm.bookbuildingStartDate >= eventForm.bookbuildingEndDate) {
      await alert('Tanggal mulai bookbuilding harus sebelum tanggal akhir.', {
        title: 'Tanggal Tidak Valid',
        severity: 'warning'
      });
      return;
    }
    if (eventForm.offeringDate && eventForm.ipoDate && eventForm.offeringDate >= eventForm.ipoDate) {
      await alert('Tanggal penawaran harus sebelum tanggal IPO.', {
        title: 'Tanggal Tidak Valid',
        severity: 'warning'
      });
      return;
    }

    updateIpoEvent(id, {
      stockCode: eventForm.stockCode.toUpperCase(),
      underwriter: eventForm.underwriter.trim() || undefined,
      offeringDate: eventForm.offeringDate || undefined,
      ipoDate: eventForm.ipoDate,
      offeringPrice: parseFloat(eventForm.offeringPrice) || 0,
      notes: eventForm.notes,
      sector: eventForm.sector || undefined,
      registrar: eventForm.registrar.trim() || undefined,
      targetBoard: eventForm.targetBoard || undefined,
      bookbuildingStartDate: eventForm.bookbuildingStartDate || undefined,
      bookbuildingEndDate: eventForm.bookbuildingEndDate || undefined,
      lotPoolingAmount: eventForm.lotPoolingAmount !== '' ? parseFloat(eventForm.lotPoolingAmount) : undefined,
      allotmentDate: eventForm.allotmentDate || undefined,
      refundDate: eventForm.refundDate || undefined,
      distributionDate: eventForm.distributionDate || undefined,
    });
    setShowEditEventModal(false);
  };

  const sortedEntries = useMemo(() => {
    const stockCode = event?.stockCode || '';
    const getSortValue = (entry: IpoEntryCalc, key: SortKey) => {
      switch (key) {
        case 'stockCode':
          return stockCode;
        case 'no':
        case 'buyPrice':
        case 'lots':
        case 'totalBuy':
        case 'sellPrice':
        case 'totalSell':
        case 'profitRp':
        case 'profitPct':
          return entry[key] ?? 0;
        case 'accountName':
        case 'email':
        case 'slTl':
        case 'action':
          return (entry[key] || '').toString().toLowerCase();
        default:
          return '';
      }
    };

    return [...entries].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'id', { numeric: true, sensitivity: 'base' });
      }

      if (comparison === 0) {
        comparison = a.no - b.no;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [entries, event?.stockCode, sortConfig]);

  const summary = useMemo(() => {
    const sellEntries = entries.filter(e => e.action === 'SELL');
    const totalCapital = entries.reduce((s, e) => s + e.totalBuy, 0);
    const totalReturn = sellEntries.reduce((s, e) => s + e.profitRp, 0);
    const totalSellValue = sellEntries.reduce((s, e) => s + e.totalSell, 0);
    const avgReturnPct = totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0;
    return { totalCapital, totalReturn, totalSellValue, avgReturnPct, totalAccounts: entries.length };
  }, [entries]);

  const resetForm = () => clearDraft();

  const validateEntry = (): boolean => {
    const errors = { ...EMPTY_ENTRY_ERRORS };
    let valid = true;
    if (!form.accountName.trim()) {
      errors.accountName = 'Nama akun wajib diisi.';
      valid = false;
    }
    const lots = parseFloat(form.lots);
    if (!form.lots || isNaN(lots) || lots <= 0) {
      errors.lots = 'Jumlah lot harus lebih dari 0.';
      valid = false;
    }
    const sell = parseFloat(form.sellPrice);
    if (form.sellPrice && (isNaN(sell) || sell < 0)) {
      errors.sellPrice = 'Harga jual tidak boleh negatif.';
      valid = false;
    }
    setEntryErrors(errors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEntry()) return;

    const payload = {
      ipoEventId: id,
      accountName: form.accountName,
      email: form.email,
      buyPrice: event?.offeringPrice || 0,
      lots: parseFloat(form.lots) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      slTl: form.slTl,
      action: form.action,
      notes: form.notes,
    };
    if (editId) {
      await updateIpoEntry(editId, payload);
    } else {
      await addIpoEntry(payload);
    }
    clearDraft();
    setEntryErrors(EMPTY_ENTRY_ERRORS);
  };

  const handleEdit = (entry: IpoEntryCalc) => {
    const draft = {
      accountName: entry.accountName,
      email: entry.email,
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
      buyPrice: event?.offeringPrice ?? entry.buyPrice,
      lots: entry.lots,
      sellPrice: entry.sellPrice,
      slTl: entry.slTl,
      action: entry.action,
      notes: entry.notes,
    });
  };

  const handleSyncToJournal = (entry: IpoEntryCalc) => {
    if (!event) return;
    const plan = {
      stockCode: event.stockCode,
      market: 'ID',
      entryPrice: event.offeringPrice,
      sellPrice: entry.sellPrice,
      lots: entry.lots,
      createdAt: event.ipoDate,
      dateSell: event.ipoDate,
      strategy: 'Value Investing',
      reason: `Sinkronisasi dari akun IPO: ${entry.accountName}`,
      tags: `ipo, ${entry.accountName.toLowerCase()}`,
    };
    navigate('/trades/new', { state: { plan } });
  };

  const handleCopyTable = () => {
    const headers = [
      'No', 'Saham', 'Harga Beli', 'Total Lot', 'Total Harga (Rp)',
      'Harga Sekarang / Jual AVG', 'Total Nilai (Rp)', 'Profit (Rp)', 'Profit (%)',
      'Akun', 'Email (Google)', 'SL/TL', 'SELL/KEEP', 'Catatan'
    ];
    const rows = sortedEntries.map(e => [
      e.no,
      event?.stockCode || '',
      e.buyPrice,
      e.lots,
      e.totalBuy,
      e.sellPrice > 0 ? e.sellPrice : '',
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

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const previewLots = parseFloat(form.lots) || 0;
  const previewBuy = event?.offeringPrice || 0;
  const previewSell = parseFloat(form.sellPrice) || 0;
  const previewTotalBuy = previewBuy * previewLots * 100;
  const previewTotalSell = previewSell > 0 ? previewSell * previewLots * 100 : 0;
  const previewProfit = previewTotalSell - previewTotalBuy;
  const previewPct = previewTotalBuy > 0 && previewTotalSell > 0 ? (previewProfit / previewTotalBuy) * 100 : 0;
  const compactCellStyle = { padding: '10px 8px', fontSize: '0.8rem', verticalAlign: 'middle' } as const;
  const compactHeaderStyle = { padding: '10px 8px', fontSize: '0.68rem' } as const;
  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    const SortIcon = isActive
      ? (sortConfig.direction === 'asc' ? Icons.ChevronUp : Icons.ChevronDown)
      : Icons.ChevronsUpDown;

    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`ipo-sort-button ${isActive ? 'active' : 'inactive'}`}
        title={`Urutkan berdasarkan ${label}`}
      >
        <span>{label}</span>
        <SortIcon size={12} />
      </button>
    );
  };

  const renderEntryForm = (submitLabel: string, submitIcon: ReactNode, isInline = false) => (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-account-name-${isInline ? 'inline' : 'main'}`}>Nama Akun *</label>
          <input
            id={`ipo-account-name-${isInline ? 'inline' : 'main'}`}
            className={`form-input${entryErrors.accountName ? ' input-error' : ''}`}
            placeholder="Akun Pribadi / Istri / dll"
            value={form.accountName}
            onChange={e => { setAccountName(e.target.value); setEntryErrors(p => ({ ...p, accountName: '' })); }}
            list="ipo-account-suggestions"
          />
          {entryErrors.accountName && (
            <div className="ipo-field-error"><Icons.AlertCircle size={12} />{entryErrors.accountName}</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-account-email-${isInline ? 'inline' : 'main'}`}>Email (Google)</label>
          <input
            id={`ipo-account-email-${isInline ? 'inline' : 'main'}`}
            type="email"
            className="form-input"
            placeholder="email@gmail.com"
            value={form.email}
            onChange={e => setAccountEmail(e.target.value)}
          />
        </div>
      </div>
      {knownIpoAccounts.length > 0 && (
        <>
          <datalist id="ipo-account-suggestions">
            {knownIpoAccounts.map((account: any) => (
              <option key={account.id} value={account.name}>
                {account.email ? `${account.name} (${account.email})` : account.name}
              </option>
            ))}
          </datalist>
          <div className="ipo-form-hint ipo-margin-b16">
            Pilih akun yang sudah pernah dipakai agar ringkasan modal IPO tetap tergroup rapi.
          </div>
        </>
      )}
      <div className="form-row ipo-grid-4">
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-buy-price-${isInline ? 'inline' : 'main'}`}>Harga Beli (Rp)</label>
          <input id={`ipo-buy-price-${isInline ? 'inline' : 'main'}`} type="text" className="form-input ipo-form-value-readonly" value={event ? formatRupiah(event.offeringPrice) : '-'} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-lots-${isInline ? 'inline' : 'main'}`}>Total Lot *</label>
          <input
            id={`ipo-lots-${isInline ? 'inline' : 'main'}`}
            type="number"
            step="any"
            min="1"
            className={`form-input${entryErrors.lots ? ' input-error' : ''}`}
            placeholder="1"
            value={form.lots}
            onChange={e => { set('lots', e.target.value); setEntryErrors(p => ({ ...p, lots: '' })); }}
          />
          {entryErrors.lots && (
            <div className="ipo-field-error"><Icons.AlertCircle size={12} />{entryErrors.lots}</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-sell-price-${isInline ? 'inline' : 'main'}`}>Harga Skrg / Jual AVG (Rp)</label>
          <input
            id={`ipo-sell-price-${isInline ? 'inline' : 'main'}`}
            type="number"
            step="any"
            min="0"
            className={`form-input${entryErrors.sellPrice ? ' input-error' : ''}`}
            placeholder="Isi harga sekarang untuk estimasi"
            value={form.sellPrice}
            onChange={e => { setSellPrice(e.target.value); setEntryErrors(p => ({ ...p, sellPrice: '' })); }}
          />
          {entryErrors.sellPrice && (
            <div className="ipo-field-error"><Icons.AlertCircle size={12} />{entryErrors.sellPrice}</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-sl-tl-${isInline ? 'inline' : 'main'}`}>SL / TL</label>
          <CustomSelect id={`ipo-sl-tl-${isInline ? 'inline' : 'main'}`} className="form-select" value={form.slTl} onChange={e => set('slTl', e.target.value)}>
            {SLTL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </CustomSelect>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-action-${isInline ? 'inline' : 'main'}`}>Aksi</label>
          <CustomSelect id={`ipo-action-${isInline ? 'inline' : 'main'}`} className="form-select" value={form.action} onChange={e => setAction(e.target.value as 'SELL' | 'KEEP')}>
            {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ipo-notes-${isInline ? 'inline' : 'main'}`}>Catatan</label>
          <input id={`ipo-notes-${isInline ? 'inline' : 'main'}`} className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="ipo-form-hint ipo-margin-b16">
        Harga beli otomatis mengikuti harga penawaran IPO.
      </div>

      {previewBuy > 0 && previewLots > 0 && (
        <div className="ipo-preview-grid">
          <div>
            <div className="ipo-kicker">Total Harga Beli</div>
            <div className="font-mono ipo-preview-value" style={blurStyle}>{formatRupiah(previewTotalBuy)}</div>
          </div>
          {previewSell > 0 && (
            <>
              <div>
                <div className="ipo-kicker">
                  {form.action === 'SELL' ? 'Total Harga Jual' : 'Estimasi Nilai Sekarang'}
                </div>
                <div className="font-mono ipo-preview-value" style={blurStyle}>{formatRupiah(previewTotalSell)}</div>
              </div>
              <div>
                <div className="ipo-kicker">
                  {form.action === 'SELL' ? 'Profit (Rp)' : 'Estimasi Profit (Rp)'}
                </div>
                <div className={`font-mono ipo-preview-value ${previewProfit >= 0 ? 'positive' : 'negative'}`} style={blurStyle}>
                  {previewProfit >= 0 ? '+' : ''}{formatRupiah(previewProfit)}
                </div>
              </div>
              <div>
                <div className="ipo-kicker">
                  {form.action === 'SELL' ? 'Profit (%)' : 'Estimasi Profit (%)'}
                </div>
                <div className={`font-mono ipo-preview-value ${previewPct >= 0 ? 'positive' : 'negative'}`}>
                  {previewPct >= 0 ? '+' : ''}{previewPct.toFixed(2)}%
                </div>
              </div>
            </>
          )}
          {form.action === 'KEEP' && previewSell <= 0 && (
            <div>
              <div className="ipo-kicker">Status</div>
              <div className="ipo-preview-value keep">KEEP - isi harga sekarang untuk lihat estimasi</div>
            </div>
          )}
        </div>
      )}

      <div className="ipo-flex-wrap">
        <button type="submit" className="btn btn-primary">
          {submitIcon}
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={resetForm}>
          <Icons.X size={15} /> Batal
        </button>
        {isInline && (
          <span className="ipo-form-hint">
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
      <div className="page-header ipo-page-header">
        <div>
          <div className="ipo-inline-meta">
            <button
              className="btn btn-ghost btn-sm ipo-btn-back"
              onClick={() => navigate('/ipo')}
            >
              <Icons.ChevronLeft size={16} /> Daftar IPO
            </button>
            <button
              className="btn btn-ghost btn-sm ipo-btn-back"
              onClick={() => navigate('/ipo/accounts')}
            >
              <Icons.Users size={16} /> Akun IPO
            </button>
          </div>
          <h1 className="page-title ipo-title-row">
            <span className="ipo-badge-pill ipo-badge-stock">
              {event.stockCode}
            </span>
            <span className="ipo-subtitle">IPO Journey</span>
            {(() => {
              const status = getIpoEventStatus(event);
              const daysToOffering = diffDaysFromToday(event.offeringDate);
              const daysToIpo = diffDaysFromToday(event.ipoDate);
              const isToday = daysToIpo === 0;
              const badgeClass = isToday ? 'today' : status;
              return (
                <span className={`ipo-event-status-badge ${badgeClass}`}>
                  {isToday ? (
                    <><Icons.Zap size={10} />IPO Hari Ini!</>
                  ) : status === 'upcoming' ? (
                    <><Icons.Clock size={10} />Upcoming</>
                  ) : status === 'active' ? (
                    <><Icons.Rocket size={10} />Active</>
                  ) : (
                    <><Icons.CheckCircle size={10} />Completed</>
                  )}
                </span>
              );
              void daysToOffering; void daysToIpo;
            })()}
            {canWrite && (
              <button
                className="btn btn-secondary btn-sm ipo-btn-inline"
                onClick={handleOpenEditEvent}
                title="Edit Detail IPO (Kode/Harga/Tanggal)"
              >
                <Icons.Edit3 size={13} /> Edit Detail
              </button>
            )}
          </h1>
          <p className="page-subtitle">
            {event.underwriter && (
              <>
                UW: <strong>{event.underwriter}</strong>
                &nbsp;·&nbsp;
              </>
            )}
            {event.offeringDate && (
              <>
                Tanggal Penawaran: <strong>{formatLongDate(event.offeringDate)}</strong>
                &nbsp;·&nbsp;
              </>
            )}
            Harga Penawaran: <strong>{formatRupiah(event.offeringPrice)}</strong>
            &nbsp;·&nbsp; Tanggal IPO: <strong>{formatLongDate(event.ipoDate)}</strong>
            {event.notes && <>&nbsp;·&nbsp; {event.notes}</>}
            {(() => {
              const daysToOffering = diffDaysFromToday(event.offeringDate);
              const daysToIpo = diffDaysFromToday(event.ipoDate);
              if (daysToIpo === 0) {
                return <span className="ipo-countdown today-label" style={{ marginLeft: 8 }}><Icons.Timer size={12} />IPO Hari Ini!</span>;
              }
              if (daysToOffering !== null && daysToOffering > 0) {
                return <span className="ipo-countdown" style={{ marginLeft: 8 }}><Icons.Timer size={12} />{daysToOffering} hari lagi penawaran</span>;
              }
              if (daysToIpo !== null && daysToIpo > 0) {
                return <span className="ipo-countdown" style={{ marginLeft: 8 }}><Icons.Timer size={12} />{daysToIpo} hari lagi listing</span>;
              }
              return null;
            })()}
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

      {/* Bento Grid Informasi Emiten */}
      <div className="ipo-emiten-bento-grid">
        <div className="bento-card emiten-card">
          <span className="bento-label">Sektor Industri</span>
          <span className="bento-value">{event.sector || '—'}</span>
        </div>
        <div className="bento-card emiten-card">
          <span className="bento-label">Papan Pencatatan</span>
          <span className="bento-value">{event.targetBoard || 'Utama'}</span>
        </div>
        <div className="bento-card emiten-card">
          <span className="bento-label">Registrar / BAE</span>
          <span className="bento-value">{event.registrar || '—'}</span>
        </div>
        <div className="bento-card emiten-card">
          <span className="bento-label">Lot Pooling / Ritel</span>
          <span className="bento-value">{event.lotPoolingAmount != null ? `${event.lotPoolingAmount}%` : '—'}</span>
        </div>
      </div>

      {/* Chronological IPO Timeline */}
      {(() => {
        const timelineStages = [
          { label: 'Bookbuilding', dateStr: event.bookbuildingStartDate && event.bookbuildingEndDate ? `${formatDate(event.bookbuildingStartDate)} - ${formatDate(event.bookbuildingEndDate)}` : (event.bookbuildingStartDate ? formatDate(event.bookbuildingStartDate) : '—'), icon: Icons.FileText },
          { label: 'Offering', dateStr: event.offeringDate ? formatDate(event.offeringDate) : '—', icon: Icons.Tag },
          { label: 'Allotment', dateStr: event.allotmentDate ? formatDate(event.allotmentDate) : '—', icon: Icons.PieChart },
          { label: 'Refund', dateStr: event.refundDate ? formatDate(event.refundDate) : '—', icon: Icons.RotateCcw },
          { label: 'Distribution', dateStr: event.distributionDate ? formatDate(event.distributionDate) : '—', icon: Icons.Share },
          { label: 'Listing (IPO)', dateStr: formatDate(event.ipoDate), icon: Icons.TrendingUp },
        ];

        const getActiveTimelineStage = (evt: any): number => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const ipo = parseDateOnly(evt.ipoDate);
          const dist = parseDateOnly(evt.distributionDate);
          const refund = parseDateOnly(evt.refundDate);
          const allotment = parseDateOnly(evt.allotmentDate);
          const offering = parseDateOnly(evt.offeringDate);
          const bbStart = parseDateOnly(evt.bookbuildingStartDate);
          const bbEnd = parseDateOnly(evt.bookbuildingEndDate);

          if (ipo && today >= ipo) return 5;
          if (dist && today >= dist) return 4;
          if (refund && today >= refund) return 3;
          if (allotment && today >= allotment) return 2;
          if (offering && today >= offering) return 1;
          if (bbStart && today >= bbStart) {
            if (bbEnd && today > bbEnd) return 0;
            return 0;
          }
          return -1;
        };

        const activeIdx = getActiveTimelineStage(event);

        return (
          <div className="bento-card ipo-timeline-container" style={{ marginBottom: 24, padding: 24 }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Icons.Calendar size={18} style={{ color: 'var(--accent-green)' }} />
              Timeline IPO
            </h3>
            <div className="ipo-timeline-steps">
              {timelineStages.map((stage, idx) => {
                const isCompleted = idx < activeIdx;
                const isActive = idx === activeIdx;
                const StepIcon = stage.icon;

                let stepClass = 'upcoming';
                if (isCompleted) stepClass = 'completed';
                if (isActive) stepClass = 'active';

                return (
                  <div key={idx} className={`ipo-timeline-step ${stepClass}`}>
                    <div className="ipo-timeline-node">
                      <StepIcon size={14} />
                    </div>
                    <div className="ipo-timeline-content">
                      <div className="ipo-timeline-label">{stage.label}</div>
                      <div className="ipo-timeline-date">{stage.dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="ipo-summary-grid">
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
            <div key={i} className="bento-card ipo-stat-card">
              <div className="ipo-stat-head">
                <span className="ipo-stat-label">
                  {stat.label}
                </span>
                <div className="ipo-stat-icon-box" style={{ background: stat.dim }}>
                  <Ic size={14} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="font-mono ipo-stat-value" style={{ color: (stat as any).valueColor || 'var(--text-primary)', ...(stat.blur ? blurStyle : {}) }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && !editId && (
        <div className="card ipo-card-accent">
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
        <div className="empty-state ipo-empty-top">
          <div className="empty-state-icon"><Icons.Users size={40} style={{ color: 'var(--text-muted)' }} /></div>
          <div className="empty-state-title">Belum ada catatan akun</div>
          <div className="empty-state-desc">Tambahkan akun-akun yang berpartisipasi dalam IPO {event.stockCode} ini.</div>
          {canWrite && (
            <button className="btn btn-primary ipo-empty-cta" onClick={() => setShowForm(true)}>
              <Icons.Plus size={16} /> Tambah Akun
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header ipo-card-header-between">
            <h3 className="card-title">Catatan Per Akun</h3>
            <div className="ipo-card-header-actions">
              <span className="ipo-muted-small">{entries.length} akun terdaftar</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm ipo-copy-btn"
                onClick={handleCopyTable}
                title="Copy semua data ke clipboard (paste ke Excel/Sheets)"
              >
                {copySuccess
                  ? <><Icons.Check size={13} style={{ color: 'var(--accent-green)' }} /> Tersalin!</>
                  : <><Icons.Clipboard size={13} /> Copy Tabel</>}
              </button>
            </div>
          </div>
          <div className="table-container ipo-table-wrap">
            <table className="table ipo-table-fixed">
              <thead>
                <tr>
                  <th style={{ ...compactHeaderStyle, width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllEntriesSelected}
                      onChange={handleSelectAllEntries}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ ...compactHeaderStyle, width: 36 }}>{renderSortableHeader('No', 'no')}</th>
                  <th style={{ ...compactHeaderStyle, width: 58 }}>{renderSortableHeader('Saham', 'stockCode')}</th>
                  <th style={{ ...compactHeaderStyle, width: 90 }}>{renderSortableHeader('Harga Beli', 'buyPrice')}</th>
                  <th style={{ ...compactHeaderStyle, width: 64 }}>{renderSortableHeader('Lot', 'lots')}</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>{renderSortableHeader('Total Beli', 'totalBuy')}</th>
                  <th style={{ ...compactHeaderStyle, width: 88 }}>{renderSortableHeader('Harga Skrg', 'sellPrice')}</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>{renderSortableHeader('Total Nilai', 'totalSell')}</th>
                  <th style={{ ...compactHeaderStyle, width: 96 }}>{renderSortableHeader('Profit', 'profitRp')}</th>
                  <th style={{ ...compactHeaderStyle, width: 70 }}>{renderSortableHeader('Profit %', 'profitPct')}</th>
                  <th style={{ ...compactHeaderStyle, width: 110 }}>{renderSortableHeader('Akun', 'accountName')}</th>
                  <th style={{ ...compactHeaderStyle, width: 140 }}>{renderSortableHeader('Email', 'email')}</th>
                  <th style={{ ...compactHeaderStyle, width: 54 }}>{renderSortableHeader('SL/TL', 'slTl')}</th>
                  <th style={{ ...compactHeaderStyle, width: 88 }}>{renderSortableHeader('Status', 'action')}</th>
                  {canWrite && <th style={{ ...compactHeaderStyle, width: 132 }}>Tools</th>}
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map(entry => {
                  const isProfit = entry.profitRp > 0;
                  const isLoss = entry.profitRp < 0;
                  const isKeep = entry.action === 'KEEP';
                  const isEditingThisRow = editId === entry.id;
                  const isRowChecked = selectedEntryIds.includes(entry.id);

                  return (
                    <Fragment key={entry.id}>
                      <tr style={{
                        background: isEditingThisRow
                          ? 'rgba(59, 130, 246, 0.08)'
                          : isRowChecked
                          ? 'rgba(59, 130, 246, 0.05)'
                          : isKeep
                          ? 'rgba(234, 179, 8, 0.04)'
                          : isProfit
                          ? 'rgba(16, 185, 129, 0.04)'
                          : isLoss
                          ? 'rgba(239, 68, 68, 0.04)'
                          : undefined,
                        boxShadow: isEditingThisRow ? 'inset 3px 0 0 var(--accent-blue-light)' : undefined,
                      }}>
                        <td style={{ ...compactCellStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isRowChecked}
                            onChange={() => {
                              setSelectedEntryIds(prev =>
                                prev.includes(entry.id)
                                  ? prev.filter(id => id !== entry.id)
                                  : [...prev, entry.id]
                              );
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ ...compactCellStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{entry.no}</td>
                        <td style={compactCellStyle}><strong>{event.stockCode}</strong></td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>{formatRupiah(entry.buyPrice)}</td>
                        <td className="font-mono" style={compactCellStyle}>{entry.lots} lot</td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>{formatRupiah(entry.totalBuy)}</td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>
                          {entry.sellPrice > 0 ? formatRupiah(entry.sellPrice) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="font-mono" style={{ ...compactCellStyle, ...blurStyle }}>
                          {entry.totalSell > 0 ? formatRupiah(entry.totalSell) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ ...compactCellStyle, fontWeight: 600, ...blurStyle }}>
                          {entry.totalSell > 0 ? (
                            <>
                              {`${isProfit ? '+' : ''}${formatRupiah(entry.profitRp)}`}
                              {entry.action === 'KEEP' && entry.sellPrice > 0 && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--accent-yellow)' }}>estimasi</div>
                              )}
                            </>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ ...compactCellStyle, fontWeight: 600 }}>
                          {entry.totalSell > 0 ? `${isProfit ? '+' : ''}${entry.profitPct.toFixed(2)}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ ...compactCellStyle, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.accountName}</td>
                        <td style={{ ...compactCellStyle, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.email || '—'}
                        </td>
                        <td style={compactCellStyle}>
                          <span className={`ipo-badge-pill ipo-badge-sltl ${entry.slTl === 'SL' ? 'sl' : entry.slTl === 'TL' ? 'tl' : 'neutral'}`}>
                            {entry.slTl}
                          </span>
                        </td>
                        <td style={compactCellStyle}>
                          <div className="ipo-status-stack">
                            <span className={`ipo-badge-pill ipo-badge-status ${entry.action === 'SELL' ? 'sell' : 'keep'}`}>
                              {entry.action}
                            </span>
                            {entry.action === 'KEEP' && entry.sellPrice > 0 && (
                              <span className="ipo-estimate-note">
                                estimasi aktif
                              </span>
                            )}
                          </div>
                        </td>
                        {canWrite && (
                          <td style={{ ...compactCellStyle, minWidth: 132 }}>
                            <div className="ipo-row-tools ipo-row-tools-tight">
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 5px', height: 24 }}
                                onClick={() => handleEdit(entry)}
                                title="Edit"
                              >
                                <Icons.Edit size={13} />
                              </button>
                              {entry.action === 'SELL' && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 5px', height: 24, color: 'var(--accent-green)' }}
                                  onClick={() => handleSyncToJournal(entry)}
                                  title="Sinkronkan ke Jurnal Saham"
                                >
                                  <Icons.Share2 size={13} />
                                </button>
                              )}
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
                          <td colSpan={canWrite ? 15 : 14} style={{ padding: 0, background: 'rgba(59, 130, 246, 0.04)' }}>
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
                    </Fragment>
                  );
                })}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-input)' }}>
                  <td colSpan={5} style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '10px 12px' }}>
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

      {/* Floating Bulk Actions Bar for IPO Entries */}
      {selectedEntryIds.length > 0 && (
        <div className="floating-bulk-bar">
          <style>{`
            .floating-bulk-bar {
              position: fixed;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(17, 24, 39, 0.85);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
              padding: 12px 24px;
              border-radius: var(--radius-md, 8px);
              z-index: 100;
              animation: slideUpBulk 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              width: max-content;
              max-width: 90vw;
            }
            @keyframes slideUpBulk {
              from { transform: translate(-50%, 40px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
            .floating-bulk-bar-content {
              display: flex;
              align-items: center;
              gap: 20px;
              flex-wrap: wrap;
            }
            .selected-count {
              font-size: 0.88rem;
              font-weight: 600;
              color: #F3F4F6;
            }
            .floating-bulk-actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }
            .btn-bulk {
              display: flex;
              align-items: center;
              gap: 6px;
            }
          `}</style>
          <div className="floating-bulk-bar-content">
            <span className="selected-count">{selectedEntryIds.length} akun terpilih</span>
            <div className="floating-bulk-actions">
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => handleBulkUpdateIpoAction('SELL')}>
                <Icons.TrendingUp size={14} />
                <span>Set SELL</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => handleBulkUpdateIpoAction('KEEP')}>
                <Icons.Layers size={14} />
                <span>Set KEEP</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => handleBulkUpdateIpoSlTl('SL')}>
                <span>SL</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => handleBulkUpdateIpoSlTl('TL')}>
                <span>TL</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => handleBulkUpdateIpoSlTl('-')}>
                <span>-</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" style={{ color: 'var(--accent-green)' }} onClick={handleBulkSyncIpoToJournal}>
                <Icons.Share2 size={14} />
                <span>Sync Jurnal</span>
              </button>
              <button className="btn btn-danger btn-sm btn-bulk" onClick={handleBulkDeleteIpoEntries}>
                <Icons.Trash2 size={14} />
                <span>Hapus</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedEntryIds([])}
                style={{ color: 'var(--text-secondary)', padding: '0 8px', fontSize: '0.8rem' }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditEventModal && (
        <div className="modal-overlay ipo-modal-overlay">
          <div className="modal ipo-modal ipo-modal-wide">
            <div className="modal-header ipo-modal-header">
              <h3>Edit Detail IPO Event</h3>
              <button className="btn btn-ghost btn-icon ipo-btn-close" onClick={() => setShowEditEventModal(false)} aria-label="Tutup modal edit IPO">
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div className="modal-body ipo-modal-body">
                {/* Datalist BAE */}
                <datalist id="bae-list-detail">
                   <option value="PT Raya Saham Registra" />
                   <option value="PT Datindo Entrycom" />
                   <option value="PT Adimitra Jasa Korpora" />
                   <option value="PT Ficomindo Buana Registrar" />
                   <option value="PT Sinartama Gunita" />
                   <option value="PT Bima Registra" />
                </datalist>

                {/* Seksi 1: Informasi Utama */}
                <div className="ipo-form-section">
                   <h4 className="ipo-form-section-title">Informasi Utama</h4>
                   <div className="form-row ipo-grid-2">
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-stock-code">Kode Saham *</label>
                         <input
                            id="ipo-event-stock-code"
                            className="form-input"
                            placeholder="Contoh: WBSA"
                            value={eventForm.stockCode}
                            onChange={e => setEventForm(prev => ({ ...prev, stockCode: e.target.value.toUpperCase() }))}
                            required
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-underwriter">Underwriter (UW)</label>
                         <input
                            id="ipo-event-underwriter"
                            className="form-input"
                            placeholder="Contoh: Mandiri Sekuritas"
                            value={eventForm.underwriter}
                            onChange={e => setEventForm(prev => ({ ...prev, underwriter: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-target-board">Papan Pencatatan</label>
                         <CustomSelect
                            id="ipo-event-target-board"
                            className="form-input"
                            value={eventForm.targetBoard}
                            onChange={e => setEventForm(prev => ({ ...prev, targetBoard: e.target.value }))}
                         >
                            <option value="Utama">Utama</option>
                            <option value="Pengembangan">Pengembangan</option>
                            <option value="Akselerasi">Akselerasi</option>
                            <option value="Ekonomi Baru">Ekonomi Baru</option>
                         </CustomSelect>
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-sector">Sektor Industri</label>
                         <CustomSelect
                            id="ipo-event-sector"
                            className="form-input"
                            value={eventForm.sector}
                            onChange={e => setEventForm(prev => ({ ...prev, sector: e.target.value }))}
                         >
                            <option value="">-- Pilih Sektor --</option>
                            <option value="Energi">Energi</option>
                            <option value="Barang Baku">Barang Baku</option>
                            <option value="Industri">Industri</option>
                            <option value="Barang Konsumen Primer">Barang Konsumen Primer</option>
                            <option value="Barang Konsumen Non-Primer">Barang Konsumen Non-Primer</option>
                            <option value="Kesehatan">Kesehatan</option>
                            <option value="Keuangan">Keuangan</option>
                            <option value="Properti & Real Estat">Properti & Real Estat</option>
                            <option value="Teknologi">Teknologi</option>
                            <option value="Infrastruktur">Infrastruktur</option>
                            <option value="Transportasi & Logistik">Transportasi & Logistik</option>
                            <option value="Lainnya">Lainnya</option>
                         </CustomSelect>
                      </div>
                   </div>
                </div>

                {/* Seksi 2: Detail Finansial & BAE */}
                <div className="ipo-form-section">
                   <h4 className="ipo-form-section-title">Detail Finansial & BAE</h4>
                   <div className="form-row ipo-grid-2">
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-offering-price">Harga Penawaran (Rp) *</label>
                         <input
                            id="ipo-event-offering-price"
                            type="number"
                            step="any"
                            className="form-input"
                            placeholder="Contoh: 100"
                            value={eventForm.offeringPrice}
                            onChange={e => setEventForm(prev => ({ ...prev, offeringPrice: e.target.value }))}
                            required
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-lot-pooling">Lot Pooling / Ritel (%)</label>
                         <input
                            id="ipo-event-lot-pooling"
                            type="number"
                            step="any"
                            className="form-input"
                            placeholder="Contoh: 2.5"
                            value={eventForm.lotPoolingAmount}
                            onChange={e => setEventForm(prev => ({ ...prev, lotPoolingAmount: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-registrar">Registrar / BAE</label>
                         <input
                            id="ipo-event-registrar"
                            className="form-input"
                            placeholder="Ketik nama BAE..."
                            value={eventForm.registrar}
                            onChange={e => setEventForm(prev => ({ ...prev, registrar: e.target.value }))}
                            list="bae-list-detail"
                         />
                      </div>
                   </div>
                </div>

                {/* Seksi 3: Timeline Penting */}
                <div className="ipo-form-section">
                   <h4 className="ipo-form-section-title">Timeline Penting</h4>
                   <div className="form-row ipo-grid-2">
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-bb-start">Bookbuilding Mulai</label>
                         <input
                            id="ipo-event-bb-start"
                            type="date"
                            className="form-input"
                            value={eventForm.bookbuildingStartDate}
                            onChange={e => setEventForm(prev => ({ ...prev, bookbuildingStartDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-bb-end">Bookbuilding Selesai</label>
                         <input
                            id="ipo-event-bb-end"
                            type="date"
                            className="form-input"
                            value={eventForm.bookbuildingEndDate}
                            onChange={e => setEventForm(prev => ({ ...prev, bookbuildingEndDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-offering-date">Tanggal Penawaran</label>
                         <input
                            id="ipo-event-offering-date"
                            type="date"
                            className="form-input"
                            value={eventForm.offeringDate}
                            onChange={e => setEventForm(prev => ({ ...prev, offeringDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-allotment-date">Tanggal Penjatahan (Allotment)</label>
                         <input
                            id="ipo-event-allotment-date"
                            type="date"
                            className="form-input"
                            value={eventForm.allotmentDate}
                            onChange={e => setEventForm(prev => ({ ...prev, allotmentDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-refund-date">Tanggal Refund</label>
                         <input
                            id="ipo-event-refund-date"
                            type="date"
                            className="form-input"
                            value={eventForm.refundDate}
                            onChange={e => setEventForm(prev => ({ ...prev, refundDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-distribution-date">Tanggal Distribusi Saham</label>
                         <input
                            id="ipo-event-distribution-date"
                            type="date"
                            className="form-input"
                            value={eventForm.distributionDate}
                            onChange={e => setEventForm(prev => ({ ...prev, distributionDate: e.target.value }))}
                         />
                      </div>
                      <div className="form-group">
                         <label className="form-label" htmlFor="ipo-event-ipo-date">Tanggal Listing / IPO *</label>
                         <input
                            id="ipo-event-ipo-date"
                            type="date"
                            className="form-input"
                            value={eventForm.ipoDate}
                            onChange={e => setEventForm(prev => ({ ...prev, ipoDate: e.target.value }))}
                            required
                         />
                      </div>
                   </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-event-notes">Catatan</label>
                  <input
                    id="ipo-event-notes"
                    className="form-input"
                    placeholder="Catatan singkat tentang IPO ini..."
                    value={eventForm.notes}
                    onChange={e => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer ipo-modal-footer">
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
