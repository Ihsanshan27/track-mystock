import type { IpoEvent } from '@/modules/ipo/types/ipo';

export interface JurnalSahamBackup {
  version: string;
  trades?: any[];
  watchlist?: any[];
  notes?: any[];
  cashflows?: any[];
  dividends?: any[];
  settings?: any;
  marketPrices?: Record<string, number>;
  portfolios?: any[];
  tradingPlans?: any[];
  ipoEvents?: any[];
  ipoEntries?: any[];
  ipoAccounts?: any[];
  bsjpTrades?: any[];
  financeAccounts?: any[];
  financeTransactions?: any[];
  exportDate?: string;
  storage?: string;
}

/**
 * Validasi skema data yang diimpor untuk memastikan integritas dan kecocokan format.
 * Mengembalikan true jika valid, atau melempar Error dengan pesan deskriptif jika tidak valid.
 */
export function validateDataSchema(data: any): boolean {
  if (!data || typeof data !== 'object') {
    throw new Error('Data yang diimpor harus berupa objek JSON yang valid.');
  }

  if (!data.version || typeof data.version !== 'string') {
    throw new Error('Format data tidak dikenali: property version tidak ditemukan.');
  }

  // Daftar key yang harus berupa array jika didefinisikan
  const arrayKeys = [
    'trades',
    'watchlist',
    'notes',
    'cashflows',
    'dividends',
    'portfolios',
    'tradingPlans',
    'ipoEvents',
    'ipoEntries',
    'ipoAccounts',
    'bsjpTrades',
    'financeAccounts',
    'financeTransactions',
  ];

  for (const key of arrayKeys) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Data tidak valid: properti "${key}" harus berupa daftar array.`);
    }
  }

  // Validasi settings harus berupa object
  if (data.settings !== undefined && (typeof data.settings !== 'object' || data.settings === null)) {
    throw new Error('Data tidak valid: properti "settings" harus berupa objek.');
  }

  // Validasi marketPrices harus berupa object
  if (data.marketPrices !== undefined && (typeof data.marketPrices !== 'object' || data.marketPrices === null)) {
    throw new Error('Data tidak valid: properti "marketPrices" harus berupa objek.');
  }

  return true;
}

/**
 * Memigrasi data dari versi lama ke versi terbaru (2.2).
 * Memberikan nilai default dan penyesuaian struktur data jika diperlukan.
 */
export function migrateDataToCurrentVersion(data: any): JurnalSahamBackup {
  // Jalankan validasi skema terlebih dahulu
  validateDataSchema(data);

  const migrated = { ...data };
  const originalVersion = data.version;

  if (parseFloat(originalVersion) < 2.2) {
    if (Array.isArray(migrated.ipoEvents)) {
      migrated.ipoEvents = migrated.ipoEvents.map((event: any) => {
        return {
          ...event,
          sector: event.sector || '',
          registrar: event.registrar || '',
          targetBoard: event.targetBoard || 'Utama',
          bookbuildingStartDate: event.bookbuildingStartDate || null,
          bookbuildingEndDate: event.bookbuildingEndDate || null,
          lotPoolingAmount: event.lotPoolingAmount != null ? Number(event.lotPoolingAmount) : undefined,
          allotmentDate: event.allotmentDate || null,
          refundDate: event.refundDate || null,
          distributionDate: event.distributionDate || null,
        };
      });
    }
  }

  // Clean up empty strings for date fields across all major arrays
  // backend class-validator @IsDateString fails if value is ""
  const dateFields = [
    'dateBuy', 'dateSell', 'date', 'exDate', 'paymentDate', 
    'offeringDate', 'ipoDate', 'bookbuildingStartDate', 
    'bookbuildingEndDate', 'allotmentDate', 'refundDate', 'distributionDate'
  ];

  const sanitizeDates = (items: any[]) => {
    if (!Array.isArray(items)) return items;
    return items.map(item => {
      const sanitized = { ...item };
      for (const field of dateFields) {
        if (sanitized[field] === '') {
          sanitized[field] = null;
        }
      }
      return sanitized;
    });
  };

  migrated.trades = sanitizeDates(migrated.trades);
  migrated.cashflows = sanitizeDates(migrated.cashflows);
  migrated.dividends = sanitizeDates(migrated.dividends);
  migrated.ipoEvents = sanitizeDates(migrated.ipoEvents);
  migrated.financeTransactions = sanitizeDates(migrated.financeTransactions);
  migrated.bsjpTrades = sanitizeDates(migrated.bsjpTrades);
  migrated.tradingPlans = sanitizeDates(migrated.tradingPlans);

  // Naikkan ke versi target terbaru
  migrated.version = '2.2';
  return migrated;
}
