import { useState } from 'react';
import { calcProfitLoss, calcBrokerFee, calcAveragePrice, calcPositionSize, calcTargetPrice, calcPensionFund, calcAverageDown, calcRiskReward } from '@/modules/trades/calculations';
import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import { useData } from '@/modules/shared/context/DataContext';
import {
  TrendingUp,
  Percent,
  Calculator,
  ArrowDownCircle,
  Scale,
  Target,
  LineChart,
  Coins,
  Coffee,
  RotateCcw,
  Plus,
  Settings,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

const TABS = [
  { id: 'pnl', label: 'Profit / Loss', icon: TrendingUp },
  { id: 'fee', label: 'Fee Broker', icon: Percent },
  { id: 'avg', label: 'Average Price', icon: Calculator },
  { id: 'avgdown', label: 'Avg Down', icon: ArrowDownCircle },
  { id: 'rr', label: 'Risk / Reward', icon: Scale },
  { id: 'position', label: 'Position Sizing', icon: Target },
  { id: 'target', label: 'Target Harga', icon: LineChart },
  { id: 'compound', label: 'Compounding', icon: Coins },
  { id: 'pension', label: 'Pensiun', icon: Coffee },
];

function ResultRow({ label, value, className, big }: { label: string; value: string; className?: string; big?: boolean }) {
  return (
    <div className="calc-result-row">
      <span className="calc-result-label">{label}</span>
      <span className={`calc-result-value ${big ? 'big' : ''} ${className || ''}`}>{value}</span>
    </div>
  );
}

function CurrencyInput({ value, onChange, placeholder, className, prefix = 'Rp' }: { value: string; onChange: (e: any) => void; placeholder?: string; className?: string; prefix?: string }) {
  const cleanValue = value ? value.toString().replace(/\D/g, '') : '';
  const displayValue = cleanValue ? parseInt(cleanValue, 10).toLocaleString('id-ID') : '';

  const handleChange = (e: any) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (onChange) onChange({ target: { value: rawValue } });
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      {prefix && <span style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }}>{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        className={className}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        style={prefix ? { paddingLeft: 36, width: '100%' } : { width: '100%' }}
      />
    </div>
  );
}

interface CalcProps {
  draft: any;
  setDraft: (val: any) => void;
}

function PnLCalculator({ draft, setDraft }: CalcProps) {
  const { buyPrice, sellPrice, lots, buyFee, sellFee } = draft;

  const setBuyPrice = (val: string) => setDraft({ ...draft, buyPrice: val });
  const setSellPrice = (val: string) => setDraft({ ...draft, sellPrice: val });
  const setLots = (val: string) => setDraft({ ...draft, lots: val });
  const setBuyFee = (val: string) => setDraft({ ...draft, buyFee: val });
  const setSellFee = (val: string) => setDraft({ ...draft, sellFee: val });

  const bp = parseFloat(buyPrice) || 0;
  const sp = parseFloat(sellPrice) || 0;
  const l = parseInt(lots) || 0;
  const result = bp > 0 && sp > 0 && l > 0
    ? calcProfitLoss({ buyPrice: bp, sellPrice: sp, lots: l, buyFee: parseFloat(buyFee), sellFee: parseFloat(sellFee) })
    : null;

  const reset = () => {
    setDraft({ buyPrice: '', sellPrice: '', lots: '', buyFee: '0.15', sellFee: '0.25' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Beli (per lembar)</label>
          <CurrencyInput className="form-input" placeholder="8.500" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Jual (per lembar)</label>
          <CurrencyInput className="form-input" placeholder="9.200" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Jumlah Lot</label>
          <input type="number" className="form-input" placeholder="10" value={lots} onChange={e => setLots(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Beli / Jual (%)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" className="form-input" step="0.01" value={buyFee} onChange={e => setBuyFee(e.target.value)} />
            <input type="number" className="form-input" step="0.01" value={sellFee} onChange={e => setSellFee(e.target.value)} />
          </div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>
      {result && (
        <div className="calc-result">
          <ResultRow label="Jumlah Lembar" value={`${result.shares.toLocaleString('id-ID')}`} />
          <ResultRow label="Total Beli" value={formatRupiah(result.totalBuy)} />
          <ResultRow label="Total Jual" value={formatRupiah(result.totalSell)} />
          <ResultRow label="Fee Beli" value={formatRupiah(result.buyCommission)} />
          <ResultRow label="Fee Jual" value={formatRupiah(result.sellCommission)} />
          <ResultRow label="Total Fee" value={formatRupiah(result.totalFee)} />
          <ResultRow label="Profit / Loss" value={`${formatRupiah(result.pnl)} (${result.pnlPercent >= 0 ? '+' : ''}${result.pnlPercent.toFixed(2)}%)`} className={result.pnl >= 0 ? 'text-profit' : 'text-loss'} big />
        </div>
      )}
    </div>
  );
}

function FeeCalculator({ draft, setDraft }: CalcProps) {
  const { price, lots, buyFeeP, sellFeeP, ppn } = draft;

  const setPrice = (val: string) => setDraft({ ...draft, price: val });
  const setLots = (val: string) => setDraft({ ...draft, lots: val });
  const setBuyFeeP = (val: string) => setDraft({ ...draft, buyFeeP: val });
  const setSellFeeP = (val: string) => setDraft({ ...draft, sellFeeP: val });
  const setPpn = (val: string) => setDraft({ ...draft, ppn: val });

  const p = parseFloat(price) || 0;
  const l = parseInt(lots) || 0;
  const result = p > 0 && l > 0
    ? calcBrokerFee({ price: p, lots: l, buyFeePercent: parseFloat(buyFeeP), sellFeePercent: parseFloat(sellFeeP), ppnPercent: parseFloat(ppn) })
    : null;

  const reset = () => {
    setDraft({ price: '', lots: '', buyFeeP: '0.15', sellFeeP: '0.15', ppn: '11' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Saham</label>
          <CurrencyInput className="form-input" placeholder="8.500" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jumlah Lot</label>
          <input type="number" className="form-input" placeholder="10" value={lots} onChange={e => setLots(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fee Beli (%)</label>
          <input type="number" className="form-input" step="0.01" value={buyFeeP} onChange={e => setBuyFeeP(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Jual (%)</label>
          <input type="number" className="form-input" step="0.01" value={sellFeeP} onChange={e => setSellFeeP(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PPN (%)</label>
          <input type="number" className="form-input" step="0.1" value={ppn} onChange={e => setPpn(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>
      {result && (
        <div className="calc-result">
          <ResultRow label="Nilai Transaksi" value={formatRupiah(result.totalValue)} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Beli</div>
          <ResultRow label="Komisi" value={formatRupiah(result.buyCommission)} />
          <ResultRow label="PPN" value={formatRupiah(result.buyPPN)} />
          <ResultRow label="Total Biaya Beli" value={formatRupiah(result.totalBuyFee)} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Jual</div>
          <ResultRow label="Komisi" value={formatRupiah(result.sellCommission)} />
          <ResultRow label="PPN" value={formatRupiah(result.sellPPN)} />
          <ResultRow label="PPh Final (0.1%)" value={formatRupiah(result.pphSell)} />
          <ResultRow label="Total Biaya Jual" value={formatRupiah(result.totalSellFee)} />
          <ResultRow label="TOTAL BIAYA" value={formatRupiah(result.totalFee)} className="text-loss" big />
        </div>
      )}
    </div>
  );
}

function AverageCalculator({ draft, setDraft }: CalcProps) {
  const purchases = draft.purchases || [{ price: '', lots: '' }, { price: '', lots: '' }];

  const setPurchases = (updater: any) => {
    const nextPurchases = typeof updater === 'function' ? updater(purchases) : updater;
    setDraft({ ...draft, purchases: nextPurchases });
  };

  const addRow = () => setPurchases((p: any) => [...p, { price: '', lots: '' }]);
  const removeRow = (i: number) => setPurchases((p: any) => p.filter((_: any, idx: number) => idx !== i));
  const updateRow = (i: number, key: string, val: string) => {
    setPurchases((p: any) => p.map((row: any, idx: number) => idx === i ? { ...row, [key]: val } : row));
  };

  const parsed = purchases.map((p: any) => ({ price: parseFloat(p.price) || 0, lots: parseInt(p.lots) || 0 }));
  const hasData = parsed.some((p: any) => p.price > 0 && p.lots > 0);
  const result = hasData ? calcAveragePrice(parsed) : null;

  const reset = () => {
    setDraft({ purchases: [{ price: '', lots: '' }, { price: '', lots: '' }] });
  };

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Masukkan daftar pembelian untuk menghitung harga rata-rata:
      </div>
      {purchases.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 8 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            {i === 0 && <label className="form-label">Harga</label>}
            <CurrencyInput className="form-input" placeholder="8.500" value={p.price} onChange={e => updateRow(i, 'price', e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            {i === 0 && <label className="form-label">Lot</label>}
            <input type="number" className="form-input" placeholder="10" value={p.lots} onChange={e => updateRow(i, 'lots', e.target.value)} />
          </div>
          {purchases.length > 2 && (
            <button className="btn btn-ghost btn-icon" onClick={() => removeRow(i)} style={{ marginBottom: 2 }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />
          Tambah Pembelian
        </button>
        <button className="btn btn-ghost btn-sm" onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {result && (
        <div className="calc-result">
          <ResultRow label="Harga Rata-rata" value={`Rp ${Math.round(result.avgPrice).toLocaleString('id-ID')}`} className="text-profit" big />
          <ResultRow label="Total Lot" value={`${result.totalLots} lot`} />
          <ResultRow label="Total Lembar" value={`${result.totalShares.toLocaleString('id-ID')}`} />
          <ResultRow label="Total Investasi" value={formatRupiah(result.totalValue)} />
        </div>
      )}
    </div>
  );
}

function PositionSizeCalculator({ draft, setDraft }: CalcProps) {
  const { settings } = useData();
  const { capital, risk, entry, stopLoss } = draft;

  const defaultRisk = (settings.defaultRiskPercent || 2).toString();
  const currentRisk = risk !== '' ? risk : defaultRisk;

  const setCapital = (val: string) => setDraft({ ...draft, capital: val });
  const setRisk = (val: string) => setDraft({ ...draft, risk: val });
  const setEntry = (val: string) => setDraft({ ...draft, entry: val });
  const setStopLoss = (val: string) => setDraft({ ...draft, stopLoss: val });

  const c = parseFloat(capital) || 0;
  const r = parseFloat(currentRisk) || 0;
  const ep = parseFloat(entry) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const result = c > 0 && r > 0 && ep > 0 && sl > 0
    ? calcPositionSize({ capital: c, riskPercent: r, entryPrice: ep, stopLoss: sl })
    : null;

  const reset = () => {
    setDraft({ capital: '', risk: defaultRisk, entry: '', stopLoss: '' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Modal Tersedia (Rp)</label>
          <CurrencyInput className="form-input" placeholder="10.000.000" value={capital} onChange={e => setCapital(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Risiko per Trade (%)</label>
          <input type="number" className="form-input" step="0.1" placeholder={defaultRisk} value={currentRisk} onChange={e => setRisk(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Entry</label>
          <CurrencyInput className="form-input" placeholder="8.500" value={entry} onChange={e => setEntry(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Stop Loss</label>
          <CurrencyInput className="form-input" placeholder="8.200" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>
      {result && (
        <div className="calc-result">
          <ResultRow label="Jumlah Lot Ideal" value={`${result.lots} lot (${result.shares} lembar)`} className="text-profit" big />
          <ResultRow label="Total Investasi" value={formatRupiah(result.totalInvestment)} />
          <ResultRow label="Nilai Risiko" value={formatRupiah(result.riskAmount)} className="text-loss" />
          <ResultRow label="Risiko per Lembar" value={formatRupiah(result.riskPerShare)} />
        </div>
      )}
    </div>
  );
}

function TargetPriceCalculator({ draft, setDraft }: CalcProps) {
  const { buyPrice, targetPct, buyFee, sellFee } = draft;

  const setBuyPrice = (val: string) => setDraft({ ...draft, buyPrice: val });
  const setTargetPct = (val: string) => setDraft({ ...draft, targetPct: val });
  const setBuyFee = (val: string) => setDraft({ ...draft, buyFee: val });
  const setSellFee = (val: string) => setDraft({ ...draft, sellFee: val });

  const bp = parseFloat(buyPrice) || 0;
  const tp = parseFloat(targetPct) || 0;
  const result = bp > 0 && tp !== 0
    ? calcTargetPrice({ buyPrice: bp, targetPercent: tp, buyFee: parseFloat(buyFee), sellFee: parseFloat(sellFee) })
    : null;

  const reset = () => {
    setDraft({ buyPrice: '', targetPct: '', buyFee: '0.15', sellFee: '0.25' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Beli</label>
          <CurrencyInput className="form-input" placeholder="8.500" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Profit (%)</label>
          <input type="number" className="form-input" step="0.1" placeholder="5" value={targetPct} onChange={e => setTargetPct(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fee Beli (%)</label>
          <input type="number" className="form-input" step="0.01" value={buyFee} onChange={e => setBuyFee(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fee Jual (%)</label>
          <input type="number" className="form-input" step="0.01" value={sellFee} onChange={e => setSellFee(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>
      {result && (
        <div className="calc-result">
          <ResultRow label="Harga Jual Target" value={`Rp ${Math.round(result.targetPrice).toLocaleString('id-ID')}`} className="text-profit" big />
          <ResultRow label="Estimasi Profit/Lot" value={formatRupiah(result.profitPerLot)} className={result.profitPerLot >= 0 ? 'text-profit' : 'text-loss'} />
          <ResultRow label="Fee per Lot" value={formatRupiah(result.feePerLot)} />
        </div>
      )}
    </div>
  );
}

function CompoundingCalculator({ draft, setDraft }: CalcProps) {
  const { principal, rate, months } = draft;

  const setPrincipal = (val: string) => setDraft({ ...draft, principal: val });
  const setRate = (val: string) => setDraft({ ...draft, rate: val });
  const setMonths = (val: string) => setDraft({ ...draft, months: val });

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) || 0;
  const m = parseInt(months) || 0;

  const calculate = () => {
    if (p <= 0 || m <= 0) return null;
    let current = p;
    for (let i = 0; i < m; i++) {
      current *= (1 + r / 100);
    }
    return {
      finalValue: current,
      totalProfit: current - p
    };
  };

  const result = calculate();

  const reset = () => {
    setDraft({ principal: '10000000', rate: '5', months: '12' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Modal Awal (Rp)</label>
          <CurrencyInput className="form-input" value={principal} onChange={e => setPrincipal(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Profit / Bulan (%)</label>
          <input type="number" className="form-input" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Durasi (Bulan)</label>
        <input type="number" className="form-input" value={months} onChange={e => setMonths(e.target.value)} />
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>

      {result && (
        <div className="calc-result">
          <ResultRow label={`Nilai Akhir (Setelah ${m} Bulan)`} value={formatRupiah(result.finalValue)} className="text-profit" big />
          <ResultRow label="Total Profit Bersih" value={`+${formatRupiah(result.totalProfit)}`} className="text-profit" />
        </div>
      )}
    </div>
  );
}

function PensionCalculator({ draft, setDraft }: CalcProps) {
  const { trades, cashflows, dividends, settings } = useData();
  const { currentAge, retireAge, monthlyExpense, currentSavings, inflationPercent, returnPercent, swrPercent } = draft;

  const setCurrentAge = (val: string) => setDraft({ ...draft, currentAge: val });
  const setRetireAge = (val: string) => setDraft({ ...draft, retireAge: val });
  const setMonthlyExpense = (val: string) => setDraft({ ...draft, monthlyExpense: val });
  const setCurrentSavings = (val: string) => setDraft({ ...draft, currentSavings: val });
  const setInflationPercent = (val: string) => setDraft({ ...draft, inflationPercent: val });
  const setReturnPercent = (val: string) => setDraft({ ...draft, returnPercent: val });
  const setSwrPercent = (val: string) => setDraft({ ...draft, swrPercent: val });

  const fillFromPortfolio = () => {
    const balance = calculatePortfolioBalance(trades, cashflows, dividends, settings.initialCapital);
    setCurrentSavings(Math.round(balance.realizedEquity).toString());
  };

  const cAge = parseInt(currentAge) || 0;
  const rAge = parseInt(retireAge) || 0;
  const expense = parseFloat(monthlyExpense) || 0;
  const savings = parseFloat(currentSavings) || 0;

  const inflation = parseFloat(inflationPercent) || 0;
  const returnRate = parseFloat(returnPercent) || 0;
  const swr = parseFloat(swrPercent) || 0;

  const result = (cAge > 0 && rAge > cAge && expense > 0 && swr > 0)
    ? calcPensionFund({
        currentAge: cAge,
        retireAge: rAge,
        monthlyExpense: expense,
        inflationPercent: inflation,
        returnPercent: returnRate,
        swrPercent: swr,
        currentSavings: savings
      })
    : null;

  const reset = () => {
    setDraft({ currentAge: '25', retireAge: '55', monthlyExpense: '5000000', currentSavings: '10000000', inflationPercent: '4', returnPercent: '10', swrPercent: '4' });
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Usia Saat Ini</label>
          <input type="number" className="form-input" placeholder="25" value={currentAge} onChange={e => setCurrentAge(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Usia Pensiun</label>
          <input type="number" className="form-input" placeholder="55" value={retireAge} onChange={e => setRetireAge(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Pengeluaran Bulanan (Saat Ini)</label>
          <CurrencyInput className="form-input" placeholder="5.000.000" value={monthlyExpense} onChange={e => setMonthlyExpense(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tabungan/Investasi Saat Ini</span>
            <button
              onClick={fillFromPortfolio}
              style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RotateCcw size={10} />
              Pakai Saldo Jurnal
            </button>
          </label>
          <CurrencyInput className="form-input" placeholder="10.000.000" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} />
        </div>
      </div>

      <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)', marginTop: 8 }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={16} />
          Asumsi & Variabel
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Inflasi Tahunan (%)</label>
            <input type="number" className="form-input" step="0.5" value={inflationPercent} onChange={e => setInflationPercent(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Imbal Hasil/Return per Tahun (%)</label>
            <input type="number" className="form-input" step="0.5" value={returnPercent} onChange={e => setReturnPercent(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" title="Safe Withdrawal Rate (Berapa % diambil per tahun saat pensiun)">SWR (%)</label>
            <input type="number" className="form-input" step="0.5" value={swrPercent} onChange={e => setSwrPercent(e.target.value)} />
          </div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>

      {result && (
        <div className="calc-result" style={{ marginTop: 8 }}>
          <ResultRow label={`Sisa Waktu Menabung`} value={`${result.yearsToRetire} Tahun`} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Nilai Uang Saat Pensiun Nanti
          </div>
          <ResultRow label="Pengeluaran Bulanan (Efek Inflasi)" value={formatRupiah(result.futureMonthlyExpense)} />
          <ResultRow label={`Target Dana Pensiun (${result.yearsToRetire} tahun lagi)`} value={formatRupiah(result.totalFundNeeded)} className="text-profit" big />
          <ResultRow label="Proyeksi Tabungan Saat Ini nanti" value={formatRupiah(result.currentSavingsFV)} />
          <ResultRow label="Sisa Dana yang Harus Dikejar" value={formatRupiah(result.shortfall)} className={result.shortfall > 0 ? "text-loss" : "text-profit"} />

          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 8 }}>
            Coast FIRE
          </div>
          <ResultRow label="Target Coast FIRE Saat Ini" value={formatRupiah(result.coastFireNumber)} />
          {result.isCoastFIRE ? (
            <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: 'var(--color-profit, #22c55e)', fontSize: '0.85rem', fontWeight: 600 }}>
              Selamat! Anda sudah mencapai Coast FIRE! Tabungan Anda cukup untuk tumbuh sendiri hingga pensiun tanpa perlu investasi tambahan.
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, fontSize: '0.85rem' }}>
              Kurang <strong>{formatRupiah(result.coastFireNumber - parseFloat(currentSavings || 0))}</strong> lagi agar bisa Coast FIRE — setelah tercapai, Anda tidak perlu menabung lagi!
            </div>
          )}

          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 8 }}>
            Action Plan
          </div>
          <ResultRow
            label="Nabung & Investasi Bulanan"
            value={result.monthlySavingsNeeded > 0 ? formatRupiah(result.monthlySavingsNeeded) : 'Rp 0 (Sudah Cukup)'}
            className="text-profit"
            big
          />

          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-card)', borderRadius: 8, fontSize: '0.85rem' }}>
            <strong>FIRE Number Saat Ini: {formatRupiah(result.currentFireNumber)}</strong><br/>
            Jika Anda ingin pensiun <em>hari ini</em> dengan gaya hidup tersebut, inilah target dana kasarnya (SWR {swrPercent}%).
          </div>
        </div>
      )}
    </div>
  );
}

function AverageDownCalculator({ draft, setDraft }: CalcProps) {
  const { currentAvg, currentLots, currentPrice, targetAvg } = draft;

  const setCurrentAvg = (val: string) => setDraft({ ...draft, currentAvg: val });
  const setCurrentLots = (val: string) => setDraft({ ...draft, currentLots: val });
  const setCurrentPrice = (val: string) => setDraft({ ...draft, currentPrice: val });
  const setTargetAvg = (val: string) => setDraft({ ...draft, targetAvg: val });

  const cAvg = parseFloat(currentAvg) || 0;
  const cLots = parseInt(currentLots) || 0;
  const cPrice = parseFloat(currentPrice) || 0;
  const tAvg = parseFloat(targetAvg) || 0;

  const result = cAvg > 0 && cLots > 0 && cPrice > 0 && tAvg > 0
    ? calcAverageDown({ currentAvg: cAvg, currentLots: cLots, currentPrice: cPrice, targetAvg: tAvg })
    : null;

  const showInvalid = cAvg > 0 && cLots > 0 && cPrice > 0 && tAvg > 0 && !result;

  const reset = () => {
    setDraft({ currentAvg: '', currentLots: '', currentPrice: '', targetAvg: '' });
  };

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Hitung berapa lot yang perlu ditambah agar harga rata-rata turun ke target yang diinginkan.
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Average Beli Saat Ini</label>
          <CurrencyInput className="form-input" placeholder="1.000" value={currentAvg} onChange={e => setCurrentAvg(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Saham Sekarang</label>
          <CurrencyInput className="form-input" placeholder="500" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Lot yang Sudah Dipegang</label>
          <input type="number" className="form-input" placeholder="100" value={currentLots} onChange={e => setCurrentLots(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Average Baru</label>
          <CurrencyInput className="form-input" placeholder="600" value={targetAvg} onChange={e => setTargetAvg(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>

      {showInvalid && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} />
          Tidak valid! Target average harus lebih kecil dari harga beli dan harga sekarang harus lebih rendah dari harga rata-rata.
        </div>
      )}

      {result && (
        <div className="calc-result">
          <div style={{ padding: '4px 0 8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amunisi yang Dibutuhkan</div>
          <ResultRow label="Lot yang Harus Dibeli" value={`${result.newLots} lot (${result.newLots * 100} lembar)`} className="text-profit" big />
          <ResultRow label="Modal Tambahan yang Diperlukan" value={formatRupiah(result.additionalCapital)} className="text-profit" />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Setelah Averaging Down</div>
          <ResultRow label="Total Lot Dipegang" value={`${result.totalLots} lot`} />
          <ResultRow label="Harga Average Baru" value={`Rp ${Math.round(result.actualNewAvg).toLocaleString('id-ID')}`} />
          <ResultRow label="Total Modal Tertanam" value={formatRupiah(result.totalCost)} />
          <div style={{ padding: '8px 0 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Perbandingan Kerugian</div>
          <ResultRow label="Kerugian Sebelum Averaging" value={formatRupiah(result.currentLoss)} className="text-loss" />
          <ResultRow label="Kerugian Setelah Averaging" value={formatRupiah(result.newLossIfCutNow)} className="text-loss" />
        </div>
      )}
    </div>
  );
}

function RiskRewardCalculator({ draft, setDraft }: CalcProps) {
  const { settings } = useData();
  const { entry, stopLoss, takeProfit, lots } = draft;

  const setEntry = (val: string) => setDraft({ ...draft, entry: val });
  const setStopLoss = (val: string) => setDraft({ ...draft, stopLoss: val });
  const setTakeProfit = (val: string) => setDraft({ ...draft, takeProfit: val });
  const setLots = (val: string) => setDraft({ ...draft, lots: val });

  const ep = parseFloat(entry) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const tp = parseFloat(takeProfit) || 0;
  const l = parseInt(lots) || 1;

  const result = ep > 0 && sl > 0 && tp > 0
    ? calcRiskReward({ entryPrice: ep, stopLoss: sl, takeProfit: tp, lots: l })
    : null;

  const showInvalid = ep > 0 && sl > 0 && tp > 0 && !result;

  const reset = () => {
    setDraft({ entry: '', stopLoss: '', takeProfit: '', lots: '1' });
  };

  const targetRR = settings.defaultTargetRR || 2;
  const getRRClass = (rr: number) => rr >= targetRR + 1 ? 'text-profit' : rr >= targetRR ? '' : 'text-loss';
  const getRRLabel = (rr: number) => rr >= targetRR + 1 ? 'Excellent!' : rr >= targetRR ? 'Baik' : 'Kurang Ideal';

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Analisa kelayakan trading plan sebelum eksekusi.
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Entry Beli</label>
          <CurrencyInput className="form-input" placeholder="8.500" value={entry} onChange={e => setEntry(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jumlah Lot</label>
          <input type="number" className="form-input" placeholder="1" value={lots} onChange={e => setLots(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Harga Stop Loss / Cut Loss</label>
          <CurrencyInput className="form-input" placeholder="8.000" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Harga Take Profit</label>
          <CurrencyInput className="form-input" placeholder="9.500" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={14} />
        Reset
      </button>

      {showInvalid && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} />
          Tidak valid! Stop Loss harus lebih rendah dari Entry, dan Take Profit harus lebih tinggi dari Entry.
        </div>
      )}

      {result && (
        <div className="calc-result">
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, marginTop: 4 }}>
            <div style={{ flex: 1, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>RISIKO</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>-{result.riskPercent.toFixed(2)}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatRupiah(result.riskAmount)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>vs</div>
            <div style={{ flex: 1, padding: '12px 16px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>POTENSI CUAN</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>+{result.rewardPercent.toFixed(2)}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatRupiah(result.rewardAmount)}</div>
            </div>
          </div>
          <ResultRow
            label={`Rasio Risk : Reward`}
            value={`1 : ${result.rrRatio.toFixed(2)} (${getRRLabel(result.rrRatio)})`}
            className={getRRClass(result.rrRatio)}
            big
          />
          <ResultRow label="Risiko per Lembar" value={formatRupiah(result.riskPerShare)} className="text-loss" />
          <ResultRow label="Potensi Cuan per Lembar" value={formatRupiah(result.rewardPerShare)} className="text-profit" />
          <div style={{ marginTop: 12, padding: '12px 16px', background: result.minWinRate <= 40 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>MINIMAL WIN-RATE AGAR TIDAK RUGI JANGKA PANJANG</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: result.minWinRate <= 40 ? '#22c55e' : '#ef4444' }}>{result.minWinRate.toFixed(1)}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {result.minWinRate <= 40
                ? `Dengan setup ini kamu boleh salah hingga ${(100 - result.minWinRate).toFixed(0)}% dari semua trade dan tetap profit secara keseluruhan!`
                : `Setup ini butuh tingkat kebenaran analisa yang cukup tinggi (Target R:R minimal adalah 1 : ${targetRR}). Pertimbangkan memperlebar Take Profit.`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const { calculatorActiveTab, setCalculatorActiveTab, calculatorDrafts, setCalculatorDrafts } = useData();

  const updateDraft = (key: string, val: any) => {
    setCalculatorDrafts((prev: any) => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="page-title">Kalkulator Saham</h1>
            <p className="page-subtitle">Hitung profit/loss, fee, average, dan position sizing</p>
          </div>
        </div>
      </div>

      <div className="calc-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`calc-tab ${calculatorActiveTab === tab.id ? 'active' : ''}`}
              onClick={() => setCalculatorActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-body">
          {calculatorActiveTab === 'pnl' && (
            <PnLCalculator
              draft={calculatorDrafts.pnl}
              setDraft={(val) => updateDraft('pnl', val)}
            />
          )}
          {calculatorActiveTab === 'fee' && (
            <FeeCalculator
              draft={calculatorDrafts.fee}
              setDraft={(val) => updateDraft('fee', val)}
            />
          )}
          {calculatorActiveTab === 'avg' && (
            <AverageCalculator
              draft={calculatorDrafts.avg}
              setDraft={(val) => updateDraft('avg', val)}
            />
          )}
          {calculatorActiveTab === 'avgdown' && (
            <AverageDownCalculator
              draft={calculatorDrafts.avgdown}
              setDraft={(val) => updateDraft('avgdown', val)}
            />
          )}
          {calculatorActiveTab === 'rr' && (
            <RiskRewardCalculator
              draft={calculatorDrafts.rr}
              setDraft={(val) => updateDraft('rr', val)}
            />
          )}
          {calculatorActiveTab === 'position' && (
            <PositionSizeCalculator
              draft={calculatorDrafts.position}
              setDraft={(val) => updateDraft('position', val)}
            />
          )}
          {calculatorActiveTab === 'target' && (
            <TargetPriceCalculator
              draft={calculatorDrafts.target}
              setDraft={(val) => updateDraft('target', val)}
            />
          )}
          {calculatorActiveTab === 'compound' && (
            <CompoundingCalculator
              draft={calculatorDrafts.compound}
              setDraft={(val) => updateDraft('compound', val)}
            />
          )}
          {calculatorActiveTab === 'pension' && (
            <PensionCalculator
              draft={calculatorDrafts.pension}
              setDraft={(val) => updateDraft('pension', val)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
