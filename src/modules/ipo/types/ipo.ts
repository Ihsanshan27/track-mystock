export interface IpoEvent {
  id: string;
  stockCode: string;       // e.g. "WBSA"
  underwriter?: string;    // nama underwriter / penjamin emisi
  offeringDate?: string;   // ISO date string "2024-05-28"
  ipoDate: string;         // ISO date string "2024-06-01"
  offeringPrice: number;   // Harga penawaran resmi (Rp)
  notes?: string;
  createdAt: string;

  // Properti Tambahan (Prioritas 5)
  sector?: string;                // Sektor Industri
  registrar?: string;             // Biro Administrasi Efek (BAE)
  targetBoard?: string;           // Target Papan Pencatatan (Utama, Pengembangan, dll)
  bookbuildingStartDate?: string; // Tanggal Mulai Bookbuilding
  bookbuildingEndDate?: string;   // Tanggal Akhir Bookbuilding
  lotPoolingAmount?: number;      // Lot Pooling / Penjatahan Terpusat (%)
  allotmentDate?: string;         // Tanggal Penjatahan (Allotment)
  refundDate?: string;            // Tanggal Refund (Pengembalian Dana)
  distributionDate?: string;      // Tanggal Distribusi Saham
}

export interface IpoEntry {
  id: string;
  ipoEventId: string;      // FK to IpoEvent.id
  ipoAccountId?: string;   // FK to IpoAccount.id
  no: number;              // row number (auto-assigned)
  accountName: string;     // nama akun broker
  email: string;           // google/email akun
  buyPrice: number;        // harga beli per lembar (Rp), mengikuti harga penawaran IPO
  lots: number;            // lot yang didapat (allotment)
  sellPrice: number;       // harga jual rata-rata; 0 jika KEEP
  slTl: 'SL' | 'TL' | '-'; // Stop Loss / Take Limit / tidak ada
  action: 'SELL' | 'KEEP';
  notes?: string;
  createdAt: string;
}

export interface IpoAccount {
  id: string;
  name: string;
  email: string;
  normalizedKey: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface IpoEntryCalc extends IpoEntry {
  totalBuy: number;        // buyPrice x lots x 100
  totalSell: number;       // sellPrice x lots x 100
  profitRp: number;        // totalSell - totalBuy
  profitPct: number;       // (profitRp / totalBuy) x 100
}

export interface IpoSummary {
  totalCapital: number;    // sum of all totalBuy
  totalReturn: number;     // sum of all profitRp
  avgReturnPct: number;    // (totalReturn / totalCapital) x 100
  accountCount: number;
  sellCount: number;
  keepCount: number;
}
