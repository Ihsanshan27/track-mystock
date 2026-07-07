import { useState, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatDate } from '@/modules/shared/utils/formatters';
import { Coins, Plus, X, Trash2, Save, ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';

export default function CashflowPage() {
  const {
    trades,
    cashflows,
    dividends,
    addCashflow,
    updateCashflow,
    deleteCashflow,
    settings,
    cashflowFormDraft,
    setCashflowFormDraft
  } = useData();
  const { confirm } = useDialog();
  const createInitialForm = () => ({
    type: 'deposit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (cashflowFormDraft && cashflowFormDraft.activeTab) return cashflowFormDraft.activeTab;
    return 'ID';
  });

  const [showForm, setShowForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.form;
    return createInitialForm();
  });

  const [editingId, setEditingId] = useState<string | null>(() => cashflowFormDraft?.editingId || null);

  useEffect(() => {
    setCashflowFormDraft({ form, showForm, activeTab, editingId });
  }, [form, showForm, activeTab, editingId, setCashflowFormDraft]);

  const isUS = activeTab === 'US';
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const initCap = isUS ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000);
  const balance = calculatePortfolioBalance(trades, cashflows, dividends, initCap, activeTab);

  const filteredCashflows = cashflows.filter((cf: any) => cf.market === activeTab || (!cf.market && activeTab === 'ID'));
  const { sortConfig, sortedItems: sortedCashflows, requestSort } = useTableSort(filteredCashflows, {
    initialKey: 'date',
    initialDirection: 'desc',
    getValue: (item: any, key: 'date' | 'type' | 'amount' | 'notes') => item[key] || '',
    tieBreaker: (a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime(),
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
    setShowForm(false);
    setCashflowFormDraft(null);
  };

  const handleCancelOrToggle = () => {
    if (showForm) {
      resetForm();
    } else {
      setEditingId(null);
      setForm(createInitialForm());
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    const payload = {
      ...form,
      market: activeTab,
      amount: parseFloat(form.amount),
    };

    if (editingId) {
      updateCashflow(editingId, payload);
    } else {
      addCashflow(payload);
    }

    resetForm();
  };

  const handleEdit = (cashflow: any) => {
    setEditingId(cashflow.id);
    setShowForm(true);
    setForm({
      type: cashflow.type || 'deposit',
      amount: String(cashflow.amount ?? ''),
      date: cashflow.date || new Date().toISOString().split('T')[0],
      notes: cashflow.notes || '',
    });
    setActiveTab(cashflow.market || 'ID');
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('Apakah Anda yakin ingin membatalkan transaksi kas ini?', {
      title: 'Batalkan Transaksi Kas',
      severity: 'danger',
      confirmText: 'Batalkan'
    });
    if (isConfirmed) {
      deleteCashflow(id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Coins size={28} />
          </div>
          <div>
            <h1 className="page-title">Cash Balance & RDN</h1>
            <p className="page-subtitle">Kelola deposit, penarikan, dan monitor buying power Anda</p>
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
              Catat Cashflow
            </span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button
          className={`tab-btn ${activeTab === 'ID' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'ID' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'ID' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('ID'); setShowForm(false); }}
        >
          Pasar Indonesia (IDR)
        </button>
        <button
          className={`tab-btn ${activeTab === 'US' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'US' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'US' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setActiveTab('US'); setShowForm(false); }}
        >
          Pasar Amerika (USD)
        </button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Modal Awal (Setting)</div>
          <div className="stat-card-value">{formatMoney(balance.initialCapital)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net Cashflow</div>
          <div className={`stat-card-value ${balance.netCashflow >= 0 ? 'text-profit' : 'text-loss'}`}>
            {balance.netCashflow > 0 ? '+' : ''}{formatMoney(balance.netCashflow)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Realized Equity (RDN Aktual)</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-blue)' }}>{formatMoney(balance.realizedEquity)}</div>
        </div>
        <div className="stat-card" style={{ border: '1px solid var(--accent-green)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="stat-card-label">Buying Power (Saldo Kas)</div>
          <div className="stat-card-value text-profit">{formatMoney(balance.buyingPower)}</div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>Dana tersedia untuk trading</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h3 className="card-title" style={{ marginBottom: 4 }}>
                  {editingId ? 'Edit Cashflow' : 'Tambah Cashflow'}
                </h3>
                <p className="analytics-secondary-text">
                  {editingId
                    ? 'Perbarui detail transaksi kas yang sudah tercatat.'
                    : 'Catat deposit atau withdraw untuk menjaga saldo kas tetap akurat.'}
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenis Transaksi</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="deposit">Deposit (Top-up)</option>
                    <option value="withdraw">Withdraw (Penarikan)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah ({isUS ? 'USD' : 'IDR'}) *</label>
                  <CurrencyInput
                    placeholder={isUS ? '100.00' : '1.000.000'}
                    value={form.amount}
                    onChange={v => set('amount', v)}
                    allowDecimal={isUS}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tanggal *</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input className="form-input" placeholder="Bonus tahunan, tarik profit, dll..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={16} />
                    {editingId ? 'Update Cashflow' : 'Simpan Cashflow'}
                  </span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Transaksi Kas ({isUS ? 'USD' : 'IDR'})</h3></div>
        {filteredCashflows.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Coins size={48} />
            </div>
            <div className="empty-state-title">Belum ada transaksi RDN</div>
            <div className="empty-state-desc">Catat setiap deposit dan withdrawal untuk melacak Buying Power Anda dengan akurat.</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th><SortableTableHeader label="Tanggal" sortKey="date" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Jenis" sortKey="type" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Jumlah" sortKey="amount" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Catatan" sortKey="notes" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedCashflows.map((cf: any) => (
                  <tr key={cf.id}>
                    <td>{formatDate(cf.date)}</td>
                    <td>
                      <span className={`badge ${cf.type === 'deposit' ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {cf.type === 'deposit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {cf.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }} className={cf.type === 'deposit' ? 'text-profit' : 'text-loss'}>
                      {cf.type === 'deposit' ? '+' : '-'}{formatMoney(cf.amount)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cf.notes || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEdit(cf)}
                          aria-label="Edit cashflow"
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(cf.id)} aria-label="Hapus cashflow">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
