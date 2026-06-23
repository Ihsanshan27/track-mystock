export type RangeKey =
  | 'today'
  | 'mtd'
  | 'ytd'
  | 'last7d'
  | 'last30d'
  | 'last90d'
  | 'custom'
  | 'all';

export type PerformanceRangeKey = '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all';

export function parseLocalDate(dateString?: string | null) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildRangeLabel(
  startDate: string | undefined,
  endDate: string | undefined,
  formatDate: (date: string) => string,
) {
  if (startDate && endDate) {
    return startDate === endDate
      ? formatDate(startDate)
      : `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) return `Dari ${formatDate(startDate)}`;
  if (endDate) return `Sampai ${formatDate(endDate)}`;
  return 'Semua Tanggal';
}

export function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export function getPerformanceRangeStart(rangeKey: PerformanceRangeKey, now: Date) {
  switch (rangeKey) {
    case '1w':
      return subtractDays(now, 6);
    case '1m':
      return subtractDays(now, 29);
    case '3m':
      return subtractDays(now, 89);
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1);
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case 'all':
    default:
      return null;
  }
}

export function buildDailyDateRange(startDate: Date, endDate: Date) {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
