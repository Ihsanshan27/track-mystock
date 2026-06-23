import { useState, useRef, useEffect } from 'react';
import { getTradeAssetTypeLabel } from '@/modules/trades/calculations';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  addTrade: (trade: any) => any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const brokerAliases: Record<string, Record<string, string[]>> = {
  default: {
    kode: ['kode', 'stockcode', 'stock code', 'ticker', 'kode saham'],
    jenis: ['jenis', 'assettype', 'asset type', 'jenis aset'],
    pasar: ['pasar', 'market'],
    tglBeli: ['tgl beli', 'datebuy', 'date buy', 'tanggal beli', 'tanggalbeli'],
    tglJual: ['tgl jual', 'datesell', 'date sell', 'tanggal jual', 'tanggaljual'],
    hargaBeli: ['harga beli', 'buyprice', 'buy price', 'hargabeli'],
    hargaJual: ['harga jual', 'sellprice', 'sell price', 'hargajual'],
    qty: ['qty', 'lots', 'lot', 'jumlah', 'quantity'],
    strategy: ['strategi', 'strategy'],
    emotion: ['emosi', 'emotion']
  },
  ajaib: {
    kode: ['ticker', 'symbol', 'kode saham', 'kode', 'stock'],
    jenis: ['jenis', 'type', 'asset class', 'assettype'],
    pasar: ['market', 'bursa', 'pasar'],
    tglBeli: ['tanggal', 'waktu', 'date', 'execution date', 'tgl beli'],
    tglJual: ['tgl jual', 'tanggal jual'],
    hargaBeli: ['harga', 'price', 'avg price', 'harga rata-rata', 'harga beli'],
    hargaJual: ['harga jual', 'sell price'],
    qty: ['volume', 'lot', 'lots', 'qty', 'shares', 'quantity'],
    strategy: ['strategi', 'strategy'],
    emotion: ['emosi', 'emotion']
  },
  mirae: {
    kode: ['stock code', 'code', 'kode saham', 'stock', 'kode'],
    jenis: ['jenis', 'type', 'asset class'],
    pasar: ['market', 'bursa'],
    tglBeli: ['trade date', 'tanggal transaksi', 'tanggal', 'date', 'tgl beli'],
    tglJual: ['tgl jual', 'tanggal jual'],
    hargaBeli: ['avg price', 'price', 'harga rata-rata', 'harga beli', 'harga'],
    hargaJual: ['harga jual', 'sell price'],
    qty: ['qty(lot)', 'volume', 'qty', 'lot', 'lots'],
    strategy: ['strategi', 'strategy'],
    emotion: ['emosi', 'emotion']
  },
  ipot: {
    kode: ['stock', 'code', 'stock code', 'kode saham', 'kode'],
    jenis: ['jenis', 'type', 'asset class'],
    pasar: ['market', 'bursa'],
    tglBeli: ['date', 'tanggal', 'trade date', 'tgl beli'],
    tglJual: ['tgl jual', 'tanggal jual'],
    hargaBeli: ['price/share', 'price', 'harga', 'avg price', 'harga beli'],
    hargaJual: ['harga jual', 'sell price'],
    qty: ['qty(lot)', 'lot', 'volume', 'qty', 'lots'],
    strategy: ['strategi', 'strategy'],
    emotion: ['emosi', 'emotion']
  }
};

export default function ImportCSVModal({ isOpen, onClose, onImportSuccess, addTrade, showToast }: ImportCSVModalProps) {
  const [fileData, setFileData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [brokerPreset, setBrokerPreset] = useState<'default' | 'ajaib' | 'mirae' | 'ipot'>('default');
  const [rawFileText, setRawFileText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rawFileText) {
      parseCSV(rawFileText, brokerPreset);
    }
  }, [rawFileText, brokerPreset]);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const templateContent = [
      ['Kode', 'Jenis', 'Pasar', 'Tgl Beli', 'Tgl Jual', 'Harga Beli', 'Harga Jual', 'Qty', 'Strategi', 'Emosi'],
      ['BBRI', 'Saham', 'ID', '2026-06-20', '2026-06-22', '4500', '4700', '10', 'Breakout', 'calm'],
      ['AAPL', 'Saham', 'US', '2026-06-15', '', '180', '', '5', 'Swing Trading', 'confident'],
      ['ABFII', 'Reksadana', 'ID', '2026-06-10', '', '1500', '', '1000', 'Value Investing', 'neutral']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-saham-template-import.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template CSV berhasil didownload');
  };

  const parseCSV = (text: string, preset: 'default' | 'ajaib' | 'mirae' | 'ipot') => {
    setErrorMsg('');
    setFileData([]);
    if (!text) return;

    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErrorMsg('CSV harus memiliki baris header dan minimal satu baris data.');
        return;
      }

      // Split by commas, handling simple quotes
      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      // Find index of key columns (case insensitive, Indonesian & English)
      const getColIdx = (aliases: string[]) => {
        return rawHeaders.findIndex(h => aliases.some(alias => h.toLowerCase() === alias.toLowerCase()));
      };

      const aliases = brokerAliases[preset] || brokerAliases.default;
      const idxKode = getColIdx(aliases.kode);
      const idxJenis = getColIdx(aliases.jenis);
      const idxPasar = getColIdx(aliases.pasar);
      const idxTglBeli = getColIdx(aliases.tglBeli);
      const idxTglJual = getColIdx(aliases.tglJual);
      const idxHargaBeli = getColIdx(aliases.hargaBeli);
      const idxHargaJual = getColIdx(aliases.hargaJual);
      const idxQty = getColIdx(aliases.qty);
      const idxStrategy = getColIdx(aliases.strategy);
      const idxEmotion = getColIdx(aliases.emotion);

      if (idxKode === -1 || idxTglBeli === -1 || idxHargaBeli === -1 || idxQty === -1) {
        setErrorMsg('Kolom wajib tidak ditemukan. Pastikan kolom Kode, Tgl Beli/Transaksi, Harga Beli/Rata-rata, dan Qty/Volume tersedia.');
        return;
      }

      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple split, handles commas but ignores quotes for numbers/tickers
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < rawHeaders.length) continue; // skip incomplete rows

        const stockCode = cols[idxKode]?.toUpperCase();
        const rawAssetType = idxJenis !== -1 ? cols[idxJenis]?.toLowerCase() : 'saham';
        const assetType = (rawAssetType === 'reksadana' || rawAssetType === 'mutual_fund') ? 'mutual_fund' : 'stock';
        const market = idxPasar !== -1 ? cols[idxPasar]?.toUpperCase() : 'ID';
        const dateBuy = cols[idxTglBeli];
        const dateSell = idxTglJual !== -1 ? cols[idxTglJual] : '';
        const buyPrice = parseFloat(cols[idxHargaBeli]);
        const sellPrice = idxHargaJual !== -1 && cols[idxHargaJual] !== '' ? parseFloat(cols[idxHargaJual]) : null;
        const lots = parseFloat(cols[idxQty]);
        const strategy = idxStrategy !== -1 ? cols[idxStrategy] : '';
        const emotion = idxEmotion !== -1 ? cols[idxEmotion]?.toLowerCase() : '';

        if (!stockCode || !dateBuy || isNaN(buyPrice) || isNaN(lots)) {
          continue; // skip invalid data
        }

        parsedRows.push({
          stockCode,
          assetType,
          market: market === 'US' ? 'US' : 'ID',
          dateBuy,
          dateSell: dateSell || null,
          buyPrice,
          sellPrice,
          lots,
          strategy: strategy || null,
          emotion: emotion || null,
          buyFee: market === 'US' ? 0 : 0.15,
          sellFee: market === 'US' ? 0 : 0.25,
        });
      }

      if (parsedRows.length === 0) {
        setErrorMsg('Tidak ada baris data valid yang berhasil dibaca.');
      } else {
        setFileData(parsedRows);
      }
    } catch (err: any) {
      setErrorMsg(`Gagal memproses file: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setFileData([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setErrorMsg('File kosong atau tidak dapat dibaca.');
          return;
        }
        setRawFileText(text);
      } catch (err: any) {
        setErrorMsg(`Gagal membaca berkas: ${err.message}`);
      }
    };

    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (fileData.length === 0) return;
    
    let successCount = 0;
    fileData.forEach(row => {
      try {
        addTrade(row);
        successCount++;
      } catch {
        // ignore
      }
    });

    showToast(`Berhasil mengimpor ${successCount} transaksi`);
    onImportSuccess();
    onClose();
  };


  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg modal-flex">
        <div className="modal-header">
          <h3 className="card-title">📥 Impor Jurnal Transaksi (CSV)</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.2rem', padding: '0 8px' }}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            Unggah file CSV dengan kolom-kolom transaksi untuk mencatat secara massal. Unduh template CSV untuk panduan format.
          </p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="form-label" htmlFor="broker-preset-select" style={{ fontSize: '0.78rem', marginBottom: 0 }}>Preset Broker / Sekuritas</label>
              <select
                id="broker-preset-select"
                className="form-select"
                style={{ minWidth: 150, padding: '4px 8px', fontSize: '0.8rem', height: '32px' }}
                value={brokerPreset}
                onChange={(e) => setBrokerPreset(e.target.value as any)}
              >
                <option value="default">Format Default</option>
                <option value="ajaib">Ajaib</option>
                <option value="mirae">Mirae Asset</option>
                <option value="ipot">IPOT</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ height: '32px' }} onClick={downloadTemplate}>
                📄 Unduh Template CSV
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ height: '32px' }} onClick={() => fileInputRef.current?.click()}>
                📁 Pilih File CSV
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {errorMsg && (
            <div className="alert alert-danger" style={{
              background: 'var(--accent-red-dim)', border: '1px solid rgba(244,63,94,0.2)',
              color: 'var(--accent-red)', padding: '10px 14px', borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem', marginBottom: '16px'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {fileData.length > 0 && (
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Pratinjau Data ({fileData.length} transaksi siap diimpor):
              </div>
              <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1 }}>
                      <th>Kode</th>
                      <th>Jenis</th>
                      <th>Pasar</th>
                      <th>Tgl Beli</th>
                      <th>Harga</th>
                      <th>Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.map((row, idx) => (
                      <tr key={idx}>
                        <td><strong>{row.stockCode}</strong></td>
                        <td>{getTradeAssetTypeLabel(row)}</td>
                        <td>{row.market}</td>
                        <td>{row.dateBuy}</td>
                        <td>{row.buyPrice.toLocaleString('id-ID')}</td>
                        <td>{row.lots}</td>
                        <td>
                          <span className={`badge ${row.dateSell ? 'badge-green' : 'badge-yellow'}`}>
                            {row.dateSell ? 'Closed' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={fileData.length === 0}
            onClick={handleImportSubmit}
          >
            Impor Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
