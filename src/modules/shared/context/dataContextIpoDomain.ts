import { generateId } from '@/modules/shared/utils/storage';
import { normalizeIpoCollections } from '@/modules/shared/context/dataContextIpoUtils';
import type { IpoAccount, IpoEntry, IpoEvent } from '@/modules/ipo/types/ipo';

type BuildIpoDomainArgs = {
  ensureWritable: () => boolean;
  ipoAccounts: IpoAccount[];
  ipoEntries: IpoEntry[];
  ipoEvents: IpoEvent[];
  logUserActivity: (
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) => void;
  persistData: (key: string, value: unknown) => void;
  setIpoAccounts: (value: IpoAccount[]) => void;
  setIpoEntries: (value: IpoEntry[]) => void;
  setIpoEvents: (value: IpoEvent[]) => void;
  showToast: (message: string, type?: string) => void;
};

export function buildIpoDomain({
  ensureWritable,
  ipoAccounts,
  ipoEntries,
  ipoEvents,
  logUserActivity,
  persistData,
  setIpoAccounts,
  setIpoEntries,
  setIpoEvents,
  showToast,
}: BuildIpoDomainArgs) {
  const getIpoOfferingPrice = (ipoEventId: string) => {
    const event = ipoEvents.find((item) => item.id === ipoEventId);
    return event?.offeringPrice;
  };

  const syncIpoCollections = (nextEntries: IpoEntry[], nextAccounts = ipoAccounts) => {
    const normalizedIpo = normalizeIpoCollections(nextEntries, nextAccounts);
    setIpoEntries(normalizedIpo.entries);
    setIpoAccounts(normalizedIpo.accounts);
    persistData('ipoEntries', normalizedIpo.entries);
    persistData('ipoAccounts', normalizedIpo.accounts);
    return normalizedIpo;
  };

  const normalizeIpoEntryBuyPrice = (entry: Omit<IpoEntry, 'buyPrice'> & { buyPrice?: number }): IpoEntry => {
    const offeringPrice = getIpoOfferingPrice(entry.ipoEventId);
    const buyPrice = (typeof offeringPrice === 'number' && !Number.isNaN(offeringPrice))
      ? offeringPrice
      : (entry.buyPrice || 0);
    return { ...entry, buyPrice };
  };

  const addIpoEvent = (event: Omit<IpoEvent, 'id' | 'createdAt'>) => {
    if (!ensureWritable()) return;
    const newEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newEvent, ...ipoEvents];
    setIpoEvents(updated);
    persistData('ipoEvents', updated);
    logUserActivity('ipo_event.created', 'ipo_event', newEvent.id, {
      stockCode: newEvent.stockCode || null,
    });
    showToast('IPO event berhasil dibuat');
    return newEvent;
  };

  const updateIpoEvent = (id: string, updates: Partial<IpoEvent>) => {
    if (!ensureWritable()) return;
    const existingEvent = ipoEvents.find((event) => event.id === id);
    const updated = ipoEvents.map((event) => (event.id === id ? { ...event, ...updates } : event));
    setIpoEvents(updated);
    persistData('ipoEvents', updated);
    if (typeof updates.offeringPrice === 'number' && !Number.isNaN(updates.offeringPrice)) {
      const updatedEntries = ipoEntries.map((entry) =>
        entry.ipoEventId === id ? { ...entry, buyPrice: updates.offeringPrice } : entry,
      );
      setIpoEntries(updatedEntries);
      persistData('ipoEntries', updatedEntries);
    }
    if (existingEvent) {
      logUserActivity('ipo_event.updated', 'ipo_event', id, {
        stockCode: updates.stockCode || existingEvent.stockCode || null,
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
    showToast('IPO event diperbarui');
  };

  const deleteIpoEvent = (id: string) => {
    if (!ensureWritable()) return;
    const existingEvent = ipoEvents.find((event) => event.id === id);
    const updatedEvents = ipoEvents.filter((event) => event.id !== id);
    setIpoEvents(updatedEvents);
    persistData('ipoEvents', updatedEvents);
    const updatedEntries = ipoEntries.filter((entry) => entry.ipoEventId !== id);
    syncIpoCollections(updatedEntries);
    if (existingEvent) {
      logUserActivity('ipo_event.deleted', 'ipo_event', id, {
        stockCode: existingEvent.stockCode || null,
      });
    }
    showToast('IPO event dihapus');
  };

  const addIpoEntry = (entry: Omit<IpoEntry, 'id' | 'createdAt' | 'buyPrice'> & { buyPrice?: number }) => {
    if (!ensureWritable()) return;
    const newEntry = normalizeIpoEntryBuyPrice({
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    });
    const updated = [...ipoEntries, newEntry];
    const normalizedIpo = syncIpoCollections(updated);
    const finalEntry = normalizedIpo.entries.find((item) => item.id === newEntry.id) || newEntry;
    logUserActivity('ipo_entry.created', 'ipo_entry', finalEntry.id, {
      ipoEventId: finalEntry.ipoEventId || null,
      accountName: finalEntry.accountName || null,
      ipoAccountId: finalEntry.ipoAccountId || null,
    });
    showToast('Entry akun ditambahkan');
    return finalEntry;
  };

  const updateIpoEntry = (id: string, updates: Partial<IpoEntry>) => {
    if (!ensureWritable()) return;
    const existingEntry = ipoEntries.find((entry) => entry.id === id);
    const updated = ipoEntries.map((entry) =>
      entry.id === id ? normalizeIpoEntryBuyPrice({ ...entry, ...updates }) : entry,
    );
    syncIpoCollections(updated);
    if (existingEntry) {
      logUserActivity('ipo_entry.updated', 'ipo_entry', id, {
        ipoEventId: updates.ipoEventId || existingEntry.ipoEventId || null,
        accountName: updates.accountName || existingEntry.accountName || null,
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
    showToast('Entry diperbarui');
  };

  const deleteIpoEntry = (id: string) => {
    if (!ensureWritable()) return;
    const existingEntry = ipoEntries.find((entry) => entry.id === id);
    const updated = ipoEntries.filter((entry) => entry.id !== id);
    syncIpoCollections(updated);
    if (existingEntry) {
      logUserActivity('ipo_entry.deleted', 'ipo_entry', id, {
        ipoEventId: existingEntry.ipoEventId || null,
        accountName: existingEntry.accountName || null,
      });
    }
    showToast('Entry dihapus');
  };

  const batchAddIpoEntries = (entries: Array<Omit<IpoEntry, 'id' | 'createdAt' | 'buyPrice'> & { buyPrice?: number }>) => {
    if (!ensureWritable()) return;
    const newEntries = entries.map((entry) =>
      normalizeIpoEntryBuyPrice({
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }),
    );
    const updated = [...ipoEntries, ...newEntries];
    syncIpoCollections(updated);
    showToast(`${newEntries.length} entry berhasil disalin`);
  };

  const batchDeleteIpoEntries = (ids: string[]) => {
    if (!ensureWritable()) return;
    const updated = ipoEntries.filter((entry) => !ids.includes(entry.id));
    syncIpoCollections(updated);
    logUserActivity('ipo_entry.batch_deleted', 'ipo_entry', ids.join(','), { count: ids.length });
    showToast(`${ids.length} entry berhasil dihapus`);
  };

  const batchUpdateIpoEntries = (ids: string[], updates: Partial<IpoEntry>) => {
    if (!ensureWritable()) return;
    const updated = ipoEntries.map((entry) =>
      ids.includes(entry.id) ? normalizeIpoEntryBuyPrice({ ...entry, ...updates }) : entry
    );
    syncIpoCollections(updated);
    logUserActivity('ipo_entry.batch_updated', 'ipo_entry', ids.join(','), { count: ids.length, fieldsUpdated: Object.keys(updates) });
    showToast(`${ids.length} entry berhasil diperbarui`);
  };

  return {
    addIpoEntry,
    addIpoEvent,
    batchAddIpoEntries,
    deleteIpoEntry,
    deleteIpoEvent,
    updateIpoEntry,
    updateIpoEvent,
    batchDeleteIpoEntries,
    batchUpdateIpoEntries,
  };
}
