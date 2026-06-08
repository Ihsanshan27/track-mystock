import { useState, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import { formatRupiah, formatDate } from '@/modules/shared/utils/formatters';
import { Coins, Plus, X, Trash2, Save, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';

export default function CashflowPage() {
  const { trades, cashflows, dividends, addCashflow, deleteCashflow, settings, cashflowFormDraft, setCashflowFormDraft } = useData();

  const [showForm, setShowForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.form;
    return { type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' };
  });

  useEffect(() => {
    setCashflowFormDraft({ form, showForm });
  }, [form, showForm, setCashflowFormDraft]);

  const balance = calculatePortfolioBalance(trades, cashflows, dividends, settings.initialCapital);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setForm({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setCashflowFormDraft(null);
    } else {
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    addCashflow({
      ...form,
      amount: parseFloat(form.amount),
    });
    setForm({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowForm(false);
    setCashflowFormDraft(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Batalkan transaksi kas ini?')) {
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

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Modal Awal (Setting)</div>
          <div className="stat-card-value">{formatRupiah(balance.initialCapital)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net Cashflow</div>
          <div className={`stat-card-value ${balance.netCashflow >= 0 ? 'text-profit' : 'text-loss'}`}>
            {balance.netCashflow > 0 ? '+' : ''}{formatRupiah(balance.netCashflow)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Realized Equity (RDN Aktual)</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-blue)' }}>{formatRupiah(balance.realizedEquity)}</div>
        </div>
        <div className="stat-card" style={{ border: '1px solid var(--accent-green)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="stat-card-label">Buying Power (Saldo Kas)</div>
          <div className="stat-card-value text-profit">{formatRupiah(balance.buyingPower)}</div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>Dana tersedia untuk trading</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenis Transaksi</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="deposit">Deposit (Top-up)</option>
                    <option value="withdraw">Withdraw (Penarikan)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Rp) *</label>
                  <CurrencyInput
                    placeholder="1.000.000"
                    value={form.amount}
                    onChange={v => set('amount', v)}
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
              <button type="submit" className="btn btn-primary">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} />
                  Simpan Cashflow
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Transaksi Kas</h3></div>
        {cashflows.length === 0 ? (
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
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {cashflows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((cf: any) => (
                  <tr key={cf.id}>
                    <td>{formatDate(cf.date)}</td>
                    <td>
                      <span className={`badge ${cf.type === 'deposit' ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {cf.type === 'deposit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {cf.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }} className={cf.type === 'deposit' ? 'text-profit' : 'text-loss'}>
                      {cf.type === 'deposit' ? '+' : '-'}{formatRupiah(cf.amount)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cf.notes || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(cf.id)} aria-label="Hapus cashflow">
                        <Trash2 size={14} />
                      </button>
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
