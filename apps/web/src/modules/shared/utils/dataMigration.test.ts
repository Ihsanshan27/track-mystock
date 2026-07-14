import { describe, expect, it } from 'vitest';
import { validateDataSchema, migrateDataToCurrentVersion } from '@/modules/shared/utils/dataMigration';

describe('dataMigration utils', () => {
  describe('validateDataSchema', () => {
    it('returns true for a valid schema', () => {
      const validData = {
        version: '2.1',
        trades: [],
        watchlist: [],
        settings: { theme: 'dark' },
        marketPrices: {},
      };
      expect(validateDataSchema(validData)).toBe(true);
    });

    it('throws error when data is not an object', () => {
      expect(() => validateDataSchema(null)).toThrow('Data yang diimpor harus berupa objek JSON yang valid.');
      expect(() => validateDataSchema('not-an-object')).toThrow('Data yang diimpor harus berupa objek JSON yang valid.');
    });

    it('throws error when version is missing', () => {
      const invalidData = {
        trades: [],
      };
      expect(() => validateDataSchema(invalidData)).toThrow('Format data tidak dikenali: property version tidak ditemukan.');
    });

    it('throws error when array keys are not arrays', () => {
      const invalidData = {
        version: '2.1',
        trades: 'not-an-array',
      };
      expect(() => validateDataSchema(invalidData)).toThrow('Data tidak valid: properti "trades" harus berupa daftar array.');
    });

    it('throws error when settings is not an object', () => {
      const invalidData = {
        version: '2.1',
        settings: 'not-an-object',
      };
      expect(() => validateDataSchema(invalidData)).toThrow('Data tidak valid: properti "settings" harus berupa objek.');
    });

    it('throws error when marketPrices is not an object', () => {
      const invalidData = {
        version: '2.1',
        marketPrices: 'not-an-object',
      };
      expect(() => validateDataSchema(invalidData)).toThrow('Data tidak valid: properti "marketPrices" harus berupa objek.');
    });
  });

  describe('migrateDataToCurrentVersion', () => {
    it('migrates older data structure to 2.2 and populates default fields for ipoEvents', () => {
      const oldData = {
        version: '2.1',
        ipoEvents: [
          {
            id: 'ipo-1',
            stockCode: 'WBSA',
            ipoDate: '2024-06-01',
            offeringPrice: 100,
            createdAt: '2024-05-30T00:00:00.000Z',
          },
        ],
      };

      const migrated = migrateDataToCurrentVersion(oldData);

      expect(migrated.version).toBe('2.2');
      expect(migrated.ipoEvents).toBeDefined();
      expect(migrated.ipoEvents![0].sector).toBe('');
      expect(migrated.ipoEvents![0].registrar).toBe('');
      expect(migrated.ipoEvents![0].targetBoard).toBe('Utama');
      expect(migrated.ipoEvents![0].bookbuildingStartDate).toBeNull();
      expect(migrated.ipoEvents![0].bookbuildingEndDate).toBeNull();
      expect(migrated.ipoEvents![0].lotPoolingAmount).toBeUndefined();
      expect(migrated.ipoEvents![0].allotmentDate).toBeNull();
      expect(migrated.ipoEvents![0].refundDate).toBeNull();
      expect(migrated.ipoEvents![0].distributionDate).toBeNull();
    });

    it('retains existing field values for ipoEvents during migration', () => {
      const oldData = {
        version: '2.1',
        ipoEvents: [
          {
            id: 'ipo-1',
            stockCode: 'WBSA',
            ipoDate: '2024-06-01',
            offeringPrice: 100,
            createdAt: '2024-05-30T00:00:00.000Z',
            sector: 'Teknologi',
            targetBoard: 'Pengembangan',
            lotPoolingAmount: 2.5,
          },
        ],
      };

      const migrated = migrateDataToCurrentVersion(oldData);

      expect(migrated.version).toBe('2.2');
      expect(migrated.ipoEvents![0].sector).toBe('Teknologi');
      expect(migrated.ipoEvents![0].targetBoard).toBe('Pengembangan');
      expect(migrated.ipoEvents![0].lotPoolingAmount).toBe(2.5);
    });
  });
});
