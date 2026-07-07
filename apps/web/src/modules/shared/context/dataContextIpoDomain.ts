import { generateId } from '@/modules/shared/utils/storage';
import {
  buildIpoAccountKey,
  normalizeIpoCollections,
  normalizeIpoEmail,
  normalizeIpoText,
} from '@/modules/shared/context/dataContextIpoUtils';
import {
  createIpoAccountApi,
  createIpoEntryApi,
  createIpoEventApi,
  deleteIpoAccountApi,
  deleteIpoEntryApi,
  deleteIpoEventApi,
  updateIpoAccountApi,
  updateIpoEntryApi,
  updateIpoEventApi,
} from '@/modules/shared/services/journalApiService';
import { isApiConfigured } from '@/modules/shared/services/apiClient';
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
  cacheLocalState: (key: string, value: unknown) => void;
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
  cacheLocalState,
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
    if (isApiConfigured) {
      cacheLocalState('ipoEntries', normalizedIpo.entries);
      cacheLocalState('ipoAccounts', normalizedIpo.accounts);
    } else {
      persistData('ipoEntries', normalizedIpo.entries);
      persistData('ipoAccounts', normalizedIpo.accounts);
    }
    return normalizedIpo;
  };

  const saveIpoEvents = (nextEvents: IpoEvent[]) => {
    setIpoEvents(nextEvents);
    if (isApiConfigured) {
      cacheLocalState('ipoEvents', nextEvents);
    } else {
      persistData('ipoEvents', nextEvents);
    }
  };

  const saveIpoAccounts = (nextAccounts: IpoAccount[]) => {
    const sortedAccounts = [...nextAccounts].sort(
      (a, b) => new Date(b.lastUsedAt || b.createdAt).getTime() - new Date(a.lastUsedAt || a.createdAt).getTime(),
    );
    setIpoAccounts(sortedAccounts);
    if (isApiConfigured) {
      cacheLocalState('ipoAccounts', sortedAccounts);
    } else {
      persistData('ipoAccounts', sortedAccounts);
    }
  };

  const saveIpoEntries = (nextEntries: IpoEntry[]) => {
    setIpoEntries(nextEntries);
    if (isApiConfigured) {
      cacheLocalState('ipoEntries', nextEntries);
    } else {
      persistData('ipoEntries', nextEntries);
    }
  };

  const normalizeIpoEntryBuyPrice = (entry: Omit<IpoEntry, 'buyPrice'> & { buyPrice?: number }): IpoEntry => {
    const offeringPrice = getIpoOfferingPrice(entry.ipoEventId);
    const buyPrice = (typeof offeringPrice === 'number' && !Number.isNaN(offeringPrice))
      ? offeringPrice
      : (entry.buyPrice || 0);
    return { ...entry, buyPrice };
  };

  const addIpoAccount = (account: Partial<IpoAccount>) => {
    if (!ensureWritable()) return null;
    const normalizedName = normalizeIpoText(account.name);
    const normalizedEmail = normalizeIpoEmail(account.email);
    const normalizedKey = buildIpoAccountKey(normalizedName);
    const nowIso = account.lastUsedAt || new Date().toISOString();

    if (!normalizedName) {
      showToast('Nama akun IPO wajib diisi.', 'error');
      return null;
    }

    const existingAccount = ipoAccounts.find((item) => item.normalizedKey === normalizedKey);
    if (existingAccount) {
      return updateIpoAccount(existingAccount.id, {
        name: normalizedName,
        email: normalizedEmail,
        normalizedKey,
        lastUsedAt: nowIso,
      });
    }

    if (isApiConfigured) {
      return createIpoAccountApi({
        name: normalizedName,
        email: normalizedEmail,
        normalizedKey,
        lastUsedAt: nowIso,
      })
        .then((createdAccount) => {
          if (!createdAccount) return null;
          saveIpoAccounts([createdAccount, ...ipoAccounts]);
          logUserActivity('ipo_account.created', 'ipo_account', createdAccount.id, {
            normalizedKey: createdAccount.normalizedKey,
          });
          showToast('Akun IPO berhasil dibuat');
          return createdAccount;
        })
        .catch((error) => {
          showToast(`Gagal membuat akun IPO: ${error.message}`, 'error');
          return null;
        });
    }

    const newAccount: IpoAccount = {
      id: generateId(),
      name: normalizedName,
      email: normalizedEmail,
      normalizedKey,
      createdAt: new Date().toISOString(),
      lastUsedAt: nowIso,
    };
    saveIpoAccounts([newAccount, ...ipoAccounts]);
    logUserActivity('ipo_account.created', 'ipo_account', newAccount.id, {
      normalizedKey: newAccount.normalizedKey,
    });
    showToast('Akun IPO berhasil dibuat');
    return newAccount;
  };

  const updateIpoAccount = (id: string, updates: Partial<IpoAccount>) => {
    if (!ensureWritable()) return null;
    const existingAccount = ipoAccounts.find((account) => account.id === id);
    if (!existingAccount) return null;

    const normalizedName = normalizeIpoText(updates.name ?? existingAccount.name);
    const normalizedEmail = normalizeIpoEmail(updates.email ?? existingAccount.email);
    const normalizedKey = buildIpoAccountKey(normalizedName);
    const conflictingAccount = ipoAccounts.find(
      (account) => account.id !== id && account.normalizedKey === normalizedKey,
    );

    if (!normalizedName) {
      showToast('Nama akun IPO wajib diisi.', 'error');
      return null;
    }

    if (conflictingAccount) {
      showToast('Nama akun IPO sudah dipakai akun lain. Gunakan nama yang berbeda.', 'error');
      return null;
    }

    const payload = {
      name: normalizedName,
      email: normalizedEmail,
      normalizedKey,
      lastUsedAt: updates.lastUsedAt ?? existingAccount.lastUsedAt,
    };

    const syncLinkedEntries = (accountRecord: IpoAccount) => {
      const relatedEntries = ipoEntries.filter((entry) => entry.ipoAccountId === id);
      if (relatedEntries.length === 0) return Promise.resolve(null);

      if (isApiConfigured) {
        return Promise.all(
          relatedEntries.map((entry) =>
            updateIpoEntryApi(entry.id, {
              accountName: accountRecord.name,
              email: accountRecord.email,
              ipoAccountId: accountRecord.id,
            }),
          ),
        ).then((updatedEntries) => {
          const updatedEntryMap = new Map(updatedEntries.filter(Boolean).map((entry) => [entry.id, entry]));
          const nextEntries = ipoEntries.map((entry) => updatedEntryMap.get(entry.id) || entry);
          saveIpoEntries(nextEntries);
          return nextEntries;
        });
      }

      const nextEntries = ipoEntries.map((entry) =>
        entry.ipoAccountId === id
          ? {
              ...entry,
              accountName: accountRecord.name,
              email: accountRecord.email,
            }
          : entry,
      );
      saveIpoEntries(nextEntries);
      return Promise.resolve(nextEntries);
    };

    if (isApiConfigured) {
      return updateIpoAccountApi(id, payload)
        .then((updatedAccount) => {
          if (!updatedAccount) return null;
          const nextAccounts = ipoAccounts.map((account) => (account.id === id ? updatedAccount : account));
          saveIpoAccounts(nextAccounts);
          return syncLinkedEntries(updatedAccount).then(() => {
            logUserActivity('ipo_account.updated', 'ipo_account', id, {
              fieldsUpdated: Object.keys(updates || {}),
              normalizedKey: updatedAccount.normalizedKey,
            });
            showToast('Akun IPO diperbarui');
            return updatedAccount;
          });
        })
        .catch((error) => {
          showToast(`Gagal memperbarui akun IPO: ${error.message}`, 'error');
          return null;
        });
    }

    const updatedAccount: IpoAccount = {
      ...existingAccount,
      ...payload,
    };
    const nextAccounts = ipoAccounts.map((account) => (account.id === id ? updatedAccount : account));
    saveIpoAccounts(nextAccounts);
    syncLinkedEntries(updatedAccount);
    logUserActivity('ipo_account.updated', 'ipo_account', id, {
      fieldsUpdated: Object.keys(updates || {}),
      normalizedKey: updatedAccount.normalizedKey,
    });
    showToast('Akun IPO diperbarui');
    return updatedAccount;
  };

  const deleteIpoAccount = (id: string) => {
    if (!ensureWritable()) return null;
    const existingAccount = ipoAccounts.find((account) => account.id === id);
    if (!existingAccount) return null;

    const linkedEntriesCount = ipoEntries.filter((entry) => entry.ipoAccountId === id).length;
    if (linkedEntriesCount > 0) {
      showToast('Akun IPO yang masih dipakai entry tidak bisa dihapus.', 'error');
      return null;
    }

    if (isApiConfigured) {
      return deleteIpoAccountApi(id)
        .then(() => {
          const nextAccounts = ipoAccounts.filter((account) => account.id !== id);
          saveIpoAccounts(nextAccounts);
          logUserActivity('ipo_account.deleted', 'ipo_account', id, {
            normalizedKey: existingAccount.normalizedKey,
          });
          showToast('Akun IPO dihapus');
          return { id };
        })
        .catch((error) => {
          showToast(`Gagal menghapus akun IPO: ${error.message}`, 'error');
          return null;
        });
    }

    const nextAccounts = ipoAccounts.filter((account) => account.id !== id);
    saveIpoAccounts(nextAccounts);
    logUserActivity('ipo_account.deleted', 'ipo_account', id, {
      normalizedKey: existingAccount.normalizedKey,
    });
    showToast('Akun IPO dihapus');
    return { id };
  };

  const addIpoEvent = (event: Omit<IpoEvent, 'id' | 'createdAt'>) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      return createIpoEventApi(event)
        .then((createdEvent) => {
          if (!createdEvent) return null;
          saveIpoEvents([createdEvent, ...ipoEvents]);
          logUserActivity('ipo_event.created', 'ipo_event', createdEvent.id, {
            stockCode: createdEvent.stockCode || null,
          });
          showToast('IPO event berhasil dibuat');
          return createdEvent;
        })
        .catch((error) => {
          showToast(`Gagal membuat IPO event: ${error.message}`, 'error');
          return null;
        });
    }

    const newEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
    saveIpoEvents([newEvent, ...ipoEvents]);
    logUserActivity('ipo_event.created', 'ipo_event', newEvent.id, {
      stockCode: newEvent.stockCode || null,
    });
    showToast('IPO event berhasil dibuat');
    return newEvent;
  };

  const updateIpoEvent = (id: string, updates: Partial<IpoEvent>) => {
    if (!ensureWritable()) return;
    const existingEvent = ipoEvents.find((event) => event.id === id);
    if (isApiConfigured) {
      return updateIpoEventApi(id, updates)
        .then(async (updatedEvent) => {
          if (!updatedEvent) return null;
          const updatedEvents = ipoEvents.map((event) => (event.id === id ? updatedEvent : event));
          saveIpoEvents(updatedEvents);

          if (typeof updates.offeringPrice === 'number' && !Number.isNaN(updates.offeringPrice)) {
            const relatedEntries = ipoEntries.filter((entry) => entry.ipoEventId === id);
            const refreshedEntries = await Promise.all(
              relatedEntries.map((entry) => updateIpoEntryApi(entry.id, { buyPrice: updates.offeringPrice })),
            );
            const entryMap = new Map(refreshedEntries.filter(Boolean).map((entry) => [entry.id, entry]));
            const nextEntries = ipoEntries.map((entry) => entryMap.get(entry.id) || entry);
            saveIpoEntries(nextEntries);
          }

          if (existingEvent) {
            logUserActivity('ipo_event.updated', 'ipo_event', id, {
              stockCode: updates.stockCode || existingEvent.stockCode || null,
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
          showToast('IPO event diperbarui');
          return updatedEvent;
        })
        .catch((error) => {
          showToast(`Gagal memperbarui IPO event: ${error.message}`, 'error');
          return null;
        });
    }

    const updated = ipoEvents.map((event) => (event.id === id ? { ...event, ...updates } : event));
    saveIpoEvents(updated);
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
    if (isApiConfigured) {
      return deleteIpoEventApi(id)
        .then(() => {
          const updatedEvents = ipoEvents.filter((event) => event.id !== id);
          saveIpoEvents(updatedEvents);
          const updatedEntries = ipoEntries.filter((entry) => entry.ipoEventId !== id);
          saveIpoEntries(updatedEntries);
          if (existingEvent) {
            logUserActivity('ipo_event.deleted', 'ipo_event', id, {
              stockCode: existingEvent.stockCode || null,
            });
          }
          showToast('IPO event dihapus');
          return { id };
        })
        .catch((error) => {
          showToast(`Gagal menghapus IPO event: ${error.message}`, 'error');
          return null;
        });
    }

    const updatedEvents = ipoEvents.filter((event) => event.id !== id);
    saveIpoEvents(updatedEvents);
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
    if (isApiConfigured) {
      const nowIso = new Date().toISOString();
      const normalizedName = normalizeIpoText(entry.accountName);
      const normalizedEmail = normalizeIpoEmail(entry.email);
      const normalizedKey = buildIpoAccountKey(normalizedName);
      const existingAccount = ipoAccounts.find((account) => account.normalizedKey === normalizedKey);

      const upsertAccount = existingAccount
        ? updateIpoAccountApi(existingAccount.id, {
            name: normalizedName || existingAccount.name,
            email: normalizedEmail,
            normalizedKey,
            lastUsedAt: nowIso,
          })
        : createIpoAccountApi({
            name: normalizedName || entry.accountName || 'Tanpa nama akun',
            email: normalizedEmail,
            normalizedKey,
            lastUsedAt: nowIso,
          });

      return Promise.resolve(upsertAccount)
        .then((account) => {
          const nextAccounts = existingAccount
            ? ipoAccounts.map((item) => (item.id === account.id ? account : item))
            : [account, ...ipoAccounts];
          saveIpoAccounts(nextAccounts);
          return createIpoEntryApi({
            ...entry,
            ipoAccountId: account.id,
            accountName: account.name,
            email: account.email,
            buyPrice: getIpoOfferingPrice(entry.ipoEventId) ?? entry.buyPrice ?? 0,
            createdAt: nowIso,
          }).then((createdEntry) => ({ account, createdEntry }));
        })
        .then(({ createdEntry }) => {
          if (!createdEntry) return null;
          const nextEntries = [...ipoEntries, createdEntry];
          saveIpoEntries(nextEntries);
          logUserActivity('ipo_entry.created', 'ipo_entry', createdEntry.id, {
            ipoEventId: createdEntry.ipoEventId || null,
            accountName: createdEntry.accountName || null,
            ipoAccountId: createdEntry.ipoAccountId || null,
          });
          showToast('Entry akun ditambahkan');
          return createdEntry;
        })
        .catch((error) => {
          showToast(`Gagal menambah entry IPO: ${error.message}`, 'error');
          return null;
        });
    }

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
    if (isApiConfigured) {
      const nextName = normalizeIpoText(updates.accountName ?? existingEntry?.accountName);
      const nextEmail = normalizeIpoEmail(updates.email ?? existingEntry?.email);
      const normalizedKey = buildIpoAccountKey(nextName);
      const existingAccount = ipoAccounts.find((account) => account.normalizedKey === normalizedKey);

      const upsertPromise = normalizedKey
        ? Promise.resolve(
            existingAccount
              ? updateIpoAccountApi(existingAccount.id, {
                  name: nextName || existingAccount.name,
                  email: nextEmail,
                  normalizedKey,
                  lastUsedAt: new Date().toISOString(),
                })
              : createIpoAccountApi({
                  name: nextName || existingEntry?.accountName || 'Tanpa nama akun',
                  email: nextEmail,
                  normalizedKey,
                  lastUsedAt: new Date().toISOString(),
                }),
          )
        : Promise.resolve(null);

      return upsertPromise
        .then((account) => {
          if (account) {
            const nextAccounts = existingAccount
              ? ipoAccounts.map((item) => (item.id === account.id ? account : item))
              : [account, ...ipoAccounts];
            saveIpoAccounts(nextAccounts);
          }

          return updateIpoEntryApi(id, {
            ...updates,
            ipoAccountId: account?.id ?? updates.ipoAccountId ?? existingEntry?.ipoAccountId,
            accountName: nextName || updates.accountName,
            email: nextEmail || updates.email,
            buyPrice: updates.buyPrice ?? getIpoOfferingPrice(updates.ipoEventId || existingEntry?.ipoEventId || ''),
          });
        })
        .then((updatedEntry) => {
          if (!updatedEntry) return null;
          const nextEntries = ipoEntries.map((entry) => (entry.id === id ? updatedEntry : entry));
          saveIpoEntries(nextEntries);
          if (existingEntry) {
            logUserActivity('ipo_entry.updated', 'ipo_entry', id, {
              ipoEventId: updates.ipoEventId || existingEntry.ipoEventId || null,
              accountName: updates.accountName || existingEntry.accountName || null,
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
          showToast('Entry diperbarui');
          return updatedEntry;
        })
        .catch((error) => {
          showToast(`Gagal memperbarui entry IPO: ${error.message}`, 'error');
          return null;
        });
    }

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
    if (isApiConfigured) {
      return deleteIpoEntryApi(id)
        .then(() => {
          const updated = ipoEntries.filter((entry) => entry.id !== id);
          saveIpoEntries(updated);
          if (existingEntry) {
            logUserActivity('ipo_entry.deleted', 'ipo_entry', id, {
              ipoEventId: existingEntry.ipoEventId || null,
              accountName: existingEntry.accountName || null,
            });
          }
          showToast('Entry dihapus');
          return { id };
        })
        .catch((error) => {
          showToast(`Gagal menghapus entry IPO: ${error.message}`, 'error');
          return null;
        });
    }

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
    if (isApiConfigured) {
      return Promise.all(entries.map((entry) => addIpoEntry(entry)))
        .then(() => {
          showToast(`${entries.length} entry berhasil disalin`);
        })
        .catch((error) => {
          showToast(`Gagal menyalin entry IPO: ${error.message}`, 'error');
        });
    }

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
    if (isApiConfigured) {
      return Promise.all(ids.map((id) => deleteIpoEntryApi(id)))
        .then(() => {
          const updated = ipoEntries.filter((entry) => !ids.includes(entry.id));
          saveIpoEntries(updated);
          logUserActivity('ipo_entry.batch_deleted', 'ipo_entry', ids.join(','), { count: ids.length });
          showToast(`${ids.length} entry berhasil dihapus`);
        })
        .catch((error) => {
          showToast(`Gagal menghapus batch entry IPO: ${error.message}`, 'error');
        });
    }

    const updated = ipoEntries.filter((entry) => !ids.includes(entry.id));
    syncIpoCollections(updated);
    logUserActivity('ipo_entry.batch_deleted', 'ipo_entry', ids.join(','), { count: ids.length });
    showToast(`${ids.length} entry berhasil dihapus`);
  };

  const batchUpdateIpoEntries = (ids: string[], updates: Partial<IpoEntry>) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      return Promise.all(ids.map((id) => updateIpoEntry(id, updates)))
        .then(() => {
          logUserActivity('ipo_entry.batch_updated', 'ipo_entry', ids.join(','), { count: ids.length, fieldsUpdated: Object.keys(updates) });
          showToast(`${ids.length} entry berhasil diperbarui`);
        })
        .catch((error) => {
          showToast(`Gagal memperbarui batch entry IPO: ${error.message}`, 'error');
        });
    }

    const updated = ipoEntries.map((entry) =>
      ids.includes(entry.id) ? normalizeIpoEntryBuyPrice({ ...entry, ...updates }) : entry
    );
    syncIpoCollections(updated);
    logUserActivity('ipo_entry.batch_updated', 'ipo_entry', ids.join(','), { count: ids.length, fieldsUpdated: Object.keys(updates) });
    showToast(`${ids.length} entry berhasil diperbarui`);
  };

  return {
    addIpoAccount,
    addIpoEntry,
    addIpoEvent,
    batchAddIpoEntries,
    deleteIpoAccount,
    deleteIpoEntry,
    deleteIpoEvent,
    updateIpoAccount,
    updateIpoEntry,
    updateIpoEvent,
    batchDeleteIpoEntries,
    batchUpdateIpoEntries,
  };
}
