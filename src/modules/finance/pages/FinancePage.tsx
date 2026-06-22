import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Plus, Pencil, Power, WalletCards, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import SelectionToggleCard from '@/modules/shared/components/SelectionToggleCard';
import { formatDate, formatRupiah } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { FINANCE_ACCOUNT_TYPE_OPTIONS } from '@/modules/finance/utils/finance';
import { calculatePortfolioBalance, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import '@/modules/finance/finance.css';

function createInitialAccountForm() {
  return {
    name: '',
    institutionName: '',
    type: 'bank',
    openingBalance: '',
    notes: '',
    isActive: true,
  };
}

export default function FinancePage() {
  const {
    financeAccounts,
    financeTransactions,
    portfolios,
    allTrades,
    allCashflows,
    allDividends,
    marketPrices,
    settings,
    addFinanceAccount,
    updateFinanceAccount,
    toggleFinanceAccountActive,
    deleteFinanceAccount,
    reorderFinanceAccounts,
    getFinanceAccountCurrentBalance,
    getFinanceSummary,
  } = useData();
  const { confirm } = useDialog();
  const blurStyle = usePrivacyStyle();
  const summary = getFinanceSummary();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);
  const [form, setForm] = useState(createInitialAccountForm());

  const accountsWithStats = useMemo(() => {
    return financeAccounts.map((account: any) => ({
      ...account,
      currentBalance: getFinanceAccountCurrentBalance(account.id),
      transactionCount: financeTransactions.filter((item: any) => item.accountId === account.id).length,
    })).map((account: any) => ({
      ...account,
      linkedPortfolioCount: portfolios.filter((portfolio: any) => portfolio.financeAccountId === account.id).length,
    }));
  }, [
    financeAccounts,
    financeTransactions,
    portfolios,
    getFinanceAccountCurrentBalance,
  ]);

  const totalTradingAssetsIDR = useMemo(() => {
    let total = 0;

    portfolios.forEach((portfolio: any) => {
      const portfolioTrades = allTrades.filter((trade: any) => (trade.portfolioId || 'default') === portfolio.id);
      const portfolioCashflows = allCashflows.filter((cashflow: any) => (cashflow.portfolioId || 'default') === portfolio.id);
      const portfolioDividends = allDividends.filter((dividend: any) => (dividend.portfolioId || 'default') === portfolio.id);
      const initialCapID = portfolio.id === 'default' ? (settings.initialCapital ?? 10000000) : 0;
      const initialCapUS = portfolio.id === 'default' ? (settings.initialCapitalUS ?? 1000) : 0;

      const statsID = calculatePortfolioBalance(
        portfolioTrades.filter((trade: any) => trade.market !== 'US'),
        portfolioCashflows.filter((cashflow: any) => cashflow.market !== 'US'),
        portfolioDividends.filter((dividend: any) => dividend.market !== 'US'),
        initialCapID,
      );

      const statsUS = calculatePortfolioBalance(
        portfolioTrades.filter((trade: any) => trade.market === 'US'),
        portfolioCashflows.filter((cashflow: any) => cashflow.market === 'US'),
        portfolioDividends.filter((dividend: any) => dividend.market === 'US'),
        initialCapUS,
      );

      const openTrades = portfolioTrades.filter((trade: any) => !trade.sellPrice || !trade.dateSell);
      let openValueID = 0;
      let openValueUS = 0;

      openTrades.forEach((trade: any) => {
        const isUS = trade.market === 'US';
        const shares = isUS ? trade.lots : trade.lots * 100;
        const currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.sellPrice || 0;

        let positionValue = trade.buyPrice * shares;
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
          positionValue = (trade.buyPrice * shares) + unrealized.pnl;
        }

        if (isUS) {
          openValueUS += positionValue;
        } else {
          openValueID += positionValue;
        }
      });

      total += (statsID.buyingPower + openValueID) + ((statsUS.buyingPower + openValueUS) * (settings.usdToIdrRate ?? 16200));
    });

    return total;
  }, [portfolios, allTrades, allCashflows, allDividends, marketPrices, settings]);

  const totalOverallAssets = totalTradingAssetsIDR + summary.totalBalance;

  const resetForm = () => {
    setForm(createInitialAccountForm());
    setEditingId(null);
    setShowForm(false);
  };

  const setValue = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      openingBalance: Number(form.openingBalance) || 0,
    };

    if (editingId) {
      updateFinanceAccount(editingId, payload);
    } else {
      addFinanceAccount(payload);
    }

    resetForm();
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setShowForm(true);
    setForm({
      name: account.name || '',
      institutionName: account.institutionName || '',
      type: account.type || 'bank',
      openingBalance: String(account.openingBalance ?? ''),
      notes: account.notes || '',
      isActive: account.isActive !== false,
    });
  };

  const moveAccountCard = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const orderedIds = accountsWithStats.map((item: any) => item.id);
    const sourceIndex = orderedIds.indexOf(sourceId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextIds = [...orderedIds];
    const [movedId] = nextIds.splice(sourceIndex, 1);
    nextIds.splice(targetIndex, 0, movedId);
    reorderFinanceAccounts(nextIds);
  };

  const handleDeleteAccount = async (account: any) => {
    const linkedPortfolios = portfolios.filter((portfolio: any) => portfolio.financeAccountId === account.id);
    const isConfirmed = await confirm(
      `Rekening "${account.name}" akan dihapus permanen.\n\nSemua transaksi ledger pada rekening ini juga akan ikut terhapus, termasuk pasangan transfer internal dan cashflow yang terhubung. ${linkedPortfolios.length > 0 ? `Sebanyak ${linkedPortfolios.length} dompet yang terhubung akan dilepas dari rekening ini.` : 'Tidak ada dompet yang terhubung ke rekening ini.'}\n\nLanjut hapus permanen?`,
      {
        title: 'Hapus Rekening Finance',
        severity: 'danger',
        confirmText: 'Hapus Permanen',
      }
    );
    if (isConfirmed) {
      deleteFinanceAccount(account.id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Landmark size={28} />
          </div>
          <div>
            <h1 className="page-title">Finance Tracker</h1>
            <p className="page-subtitle">Ledger kas pribadi untuk rekening bank dan e-wallet. Satu rekening bisa dipakai banyak dompet, tapi tiap dompet hanya boleh memilih satu rekening.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} />
            {showForm ? 'Tutup Form' : 'Tambah Rekening'}
          </span>
        </button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Kas Pribadi</div>
          <div className="stat-card-value text-profit" style={blurStyle}>{formatRupiah(summary.totalBalance)}</div>
          <div className="finance-summary-note">{summary.activeAccounts} rekening aktif</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Pemasukan</div>
          <div className="stat-card-value" style={{ ...blurStyle, color: 'var(--accent-green)' }}>{formatRupiah(summary.totalIncome)}</div>
          <div className="finance-summary-note">Akumulasi transaksi income</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Pengeluaran</div>
          <div className="stat-card-value" style={{ ...blurStyle, color: 'var(--accent-red)' }}>{formatRupiah(summary.totalExpense)}</div>
          <div className="finance-summary-note">Akumulasi transaksi expense</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Asset Keseluruhan</div>
          <div className="stat-card-value" style={blurStyle}>{formatRupiah(totalOverallAssets)}</div>
          <div className="finance-summary-note">Trading + saldo semua rekening finance</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h3 className="card-title" style={{ marginBottom: 4 }}>{editingId ? 'Edit Rekening' : 'Tambah Rekening Baru'}</h3>
                <p className="analytics-secondary-text">Saldo berjalan akan selalu dihitung dari saldo awal ditambah mutasi transaksi.</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-account-name">Nama Rekening *</label>
                  <input id="finance-account-name" className="form-input" value={form.name} onChange={(event) => setValue('name', event.target.value)} placeholder="BCA Operasional" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-account-institution">Institusi *</label>
                  <input id="finance-account-institution" className="form-input" value={form.institutionName} onChange={(event) => setValue('institutionName', event.target.value)} placeholder="Bank Central Asia / GoPay / OVO" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-account-type">Tipe Akun</label>
                  <select id="finance-account-type" className="form-select" value={form.type} onChange={(event) => setValue('type', event.target.value)}>
                    {FINANCE_ACCOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-account-opening">Saldo Awal (IDR)</label>
                  <CurrencyInput
                    id="finance-account-opening"
                    value={form.openingBalance}
                    onChange={(value) => setValue('openingBalance', value)}
                    placeholder="1.000.000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="finance-account-notes">Catatan</label>
                  <textarea id="finance-account-notes" className="form-input" rows={3} value={form.notes} onChange={(event) => setValue('notes', event.target.value)} placeholder="Opsional: tujuan rekening, limit, atau catatan lain." />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SelectionToggleCard
                  checked={Boolean(form.isActive)}
                  onToggle={() => setValue('isActive', !form.isActive)}
                  title="Rekening aktif"
                  description="Rekening aktif bisa dipakai untuk transaksi baru dan pilihan koneksi dompet."
                  compact
                />
              </div>
              <div className="finance-actions">
                <button type="submit" className="btn btn-primary">{editingId ? 'Simpan Perubahan' : 'Simpan Rekening'}</button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accountsWithStats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><WalletCards size={48} /></div>
          <div className="empty-state-title">Belum ada rekening finance</div>
          <div className="empty-state-desc">Tambahkan rekening bank atau e-wallet pertama untuk mulai mencatat mutasi kas pribadi Anda.</div>
        </div>
      ) : (
        <div className="finance-grid">
          {accountsWithStats.map((account: any) => (
            <div
              key={account.id}
              className={`bento-card finance-account-card ${draggedAccountId === account.id ? 'is-dragging' : ''} ${dragOverAccountId === account.id ? 'is-drag-over' : ''}`}
              draggable
              onDragStart={() => {
                setDraggedAccountId(account.id);
                setDragOverAccountId(account.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedAccountId && draggedAccountId !== account.id) {
                  setDragOverAccountId(account.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                moveAccountCard(draggedAccountId || '', account.id);
                setDraggedAccountId(null);
                setDragOverAccountId(null);
              }}
              onDragEnd={() => {
                setDraggedAccountId(null);
                setDragOverAccountId(null);
              }}
            >
              <div className="finance-account-head">
                <div>
                  <div className="finance-account-meta" style={{ marginBottom: 8 }}>
                    <span className="finance-pill">{account.type === 'bank' ? 'Bank' : 'E-Wallet'}</span>
                    {!account.isActive && <span className="finance-pill finance-pill-muted">Nonaktif</span>}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{account.name}</h3>
                  <div className="finance-summary-note">{account.institutionName}</div>
                </div>
                <button
                  type="button"
                  className="finance-drag-handle"
                  title="Geser untuk mengatur posisi card"
                  aria-label={`Geser posisi card ${account.name}`}
                >
                  <ArrowRightLeft size={18} />
                </button>
              </div>

              <div>
                <div className="stat-card-label">Saldo Berjalan</div>
                <div className="stat-card-value" style={blurStyle}>{formatRupiah(account.currentBalance)}</div>
                <div className="finance-summary-note">{account.transactionCount} transaksi • {account.linkedPortfolioCount} dompet terhubung</div>
                <div className="finance-summary-note">Dibuat {formatDate(account.createdAt)}</div>
              </div>
              {account.notes ? (
                <div className="finance-summary-note" style={{ minHeight: 40 }}>{account.notes}</div>
              ) : (
                <div className="finance-summary-note" style={{ minHeight: 40 }}>Tanpa catatan tambahan.</div>
              )}

              <div className="finance-actions">
                <Link className="btn btn-secondary" to={`/finance/${account.id}`}>Buka Ledger</Link>
                <button type="button" className="btn btn-ghost" onClick={() => handleEdit(account)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={16} />
                    Edit
                  </span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => handleDeleteAccount(account)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={16} />
                    Hapus
                  </span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => toggleFinanceAccountActive(account.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Power size={16} />
                    {account.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
