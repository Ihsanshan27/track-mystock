import type { IpoEvent } from '@/modules/ipo/types/ipo';

export type IpoEventStatus = 'upcoming' | 'active' | 'completed';

export function parseDateOnly(dateString?: string) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getIpoEventStatus(event: IpoEvent, baseDate = new Date()): IpoEventStatus {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  const offeringDate = parseDateOnly(event.offeringDate);
  const ipoDate = parseDateOnly(event.ipoDate);

  if (offeringDate) offeringDate.setHours(0, 0, 0, 0);
  if (!ipoDate) return 'upcoming';
  ipoDate.setHours(0, 0, 0, 0);

  if (today > ipoDate) return 'completed';
  if (offeringDate && today < offeringDate) return 'upcoming';
  return 'active';
}
