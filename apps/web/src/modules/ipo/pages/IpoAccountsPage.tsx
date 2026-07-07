import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatDateTime, formatRupiah } from '@/modules/shared/utils/formatters';
import { buildIpoAccountKey, normalizeIpoEmail, normalizeIpoText } from '@/modules/shared/context/dataContextIpoUtils';
import type { IpoAccount, IpoEvent } from '@/modules/ipo/types/ipo';
import * as Icons from 'lucide-react';
import '@/modules/ipo/ipo.css';

const EMPTY_FORM = {
  name: '',
  email: '',
};

export default function IpoAccountsPage() {
  const navigate = useNavigate();
  const blurStyle = usePrivacyStyle();
  const { confirm, alert } = useDialog();
  const {
    ipoAccounts,
    ipoEntries,
    ipoEvents,
    addIpoAccount,
    updateIpoAccount,
    deleteIpoAccount,
    canWrite,
  } = useData();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const accountRows = useMemo(() => {
    const eventMap = new Map<string, IpoEvent>(ipoEvents.map((event: IpoEvent) => [event.id, event]));

    return ipoAccounts.map((account: IpoAccount) => {
      const linkedEntries = ipoEntries
        .filter((entry: any) => entry.ipoAccountId === account.id)
        .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      const joinedEventIds = Array.from(new Set(linkedEntries.map((entry: any) => entry.ipoEventId)));
      const joinedEvents = joinedEventIds
        .map((eventId) => eventMap.get(eventId))
        .filter(Boolean) as IpoEvent[];
      const latestEntry = linkedEntries[0] || null;
      const latestEvent = latestEntry ? eventMap.get(latestEntry.ipoEventId) || null : null;
      const totalRequestedLots = linkedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.lots) || 0), 0);
      const totalCapital = linkedEntries.reduce((sum: number, entry: any) => {
        const event = eventMap.get(entry.ipoEventId);
        const price = Number(event?.offeringPrice ?? entry.buyPrice) || 0;
        return sum + (price * (Number(entry.lots) || 0) * 100);
      }, 0);

      return {
        ...account,
        linkedEntries,
        joinedEventIds,
        joinedEvents,
        eventCount: joinedEvents.length,
        entryCount: linkedEntries.length,
        totalRequestedLots,
        totalCapital,
        latestEvent,
        latestUsedAt: latestEntry?.createdAt || account.lastUsedAt || account.createdAt,
        latestEventCodes: joinedEvents.slice(0, 3).map((event) => event.stockCode).join(', '),
      };
    });
  }, [ipoAccounts, ipoEntries, ipoEvents]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return accountRows;
    return accountRows.filter((row) => {
      const haystack = [
        row.name,
        row.email,
        row.normalizedKey,
        row.latestEventCodes,
        row.joinedEvents.map((event) => event.stockCode).join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [accountRows, search]);

  const { sortConfig, sortedItems: sortedRows, requestSort } = useTableSort(filteredRows, {
    initialKey: 'latestUsedAt',
    initialDirection: 'desc',
    getValue: (
      item: any,
      key:
        | 'name'
        | 'email'
        | 'eventCount'
        | 'entryCount'
        | 'totalRequestedLots'
        | 'totalCapital'
        | 'latestUsedAt',
    ) => item[key] ?? '',
  });

  const stats = useMemo(() => {
    const usedAccounts = accountRows.filter((row) => row.entryCount > 0).length;
    const totalEntries = accountRows.reduce((sum, row) => sum + row.entryCount, 0);
    const totalCapital = accountRows.reduce((sum, row) => sum + row.totalCapital, 0);
    const mostActive = [...accountRows].sort((left, right) => right.entryCount - left.entryCount)[0] || null;
    return {
      totalAccounts: accountRows.length,
      usedAccounts,
      unusedAccounts: accountRows.length - usedAccounts,
      totalEntries,
      totalCapital,
      mostActive,
    };
  }, [accountRows]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (account: IpoAccount) => {
    setForm({
      name: account.name || '',
      email: account.email || '',
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const validateAccountForm = async () => {
    const normalizedName = normalizeIpoText(form.name);
    const normalizedEmail = normalizeIpoEmail(form.email);
    const normalizedKey = buildIpoAccountKey(normalizedName);

    if (!normalizedName) {
      await alert('Nama akun IPO wajib diisi.', {
        title: 'Validasi Akun IPO',
        severity: 'warning',
      });
      return null;
    }

    const duplicate = ipoAccounts.find(
      (account: IpoAccount) => account.id !== editingId && account.normalizedKey === normalizedKey,
    );
    if (duplicate) {
      await alert('Nama akun IPO sudah dipakai akun lain. Gunakan nama yang berbeda.', {
        title: 'Duplikasi Akun IPO',
        severity: 'warning',
      });
      return null;
    }

    return {
      name: normalizedName,
      email: normalizedEmail,
      normalizedKey,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = await validateAccountForm();
    if (!payload) return;

    if (editingId) {
      await updateIpoAccount(editingId, payload);
    } else {
      await addIpoAccount(payload);
    }

    resetForm();
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/ipo')}
              style={{ padding: '4px 8px' }}
            >
              <Icons.ChevronLeft size={16} /> Kembali
            </button>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Users size={26} style={{ color: 'var(--accent-blue-light)' }} />
            Manajemen Akun IPO
          </h1>
          <p className="page-subtitle">Kelola registry akun IPO, pantau pemakaiannya lintas event, dan rapikan reuse akun di seluruh journey IPO.</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => (showForm ? resetForm() : openCreate())}>
            {showForm ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
            {showForm ? 'Tutup Form' : 'Akun IPO Baru'}
          </button>
        )}
      </div>

      <div className="ipo-tabs-nav">
        <button type="button" className="ipo-tab-btn" onClick={() => navigate('/ipo')}>
          <Icons.Rocket size={16} />
          IPO Journey
        </button>
        <button type="button" className="ipo-tab-btn" onClick={() => navigate('/ipo/summary')}>
          <Icons.BarChart3 size={16} />
          Ringkasan IPO
        </button>
        <button type="button" className="ipo-tab-btn active">
          <Icons.Users size={16} />
          Akun IPO
        </button>
      </div>

      <div className="ipo-summary-grid" style={{ marginBottom: 24 }}>
        {[
          {
            label: 'Total Akun',
            value: String(stats.totalAccounts),
            note: `${stats.usedAccounts} aktif, ${stats.unusedAccounts} belum dipakai`,
            icon: Icons.Users,
          },
          {
            label: 'Total Partisipasi',
            value: `${stats.totalEntries} entry`,
            note: 'Akumulasi seluruh entry yang terhubung ke registry akun',
            icon: Icons.FileSpreadsheet,
          },
          {
            label: 'Estimasi Modal',
            value: formatRupiah(stats.totalCapital),
            note: 'Akumulasi modal historis dari seluruh akun IPO',
            icon: Icons.Wallet,
            blur: true,
          },
          {
            label: 'Akun Teraktif',
            value: stats.mostActive?.name || '-',
            note: stats.mostActive ? `${stats.mostActive.entryCount} entry di ${stats.mostActive.eventCount} IPO` : 'Belum ada akun aktif',
            icon: Icons.Activity,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="ipo-stat-card">
              <div className="ipo-stat-head">
                <div>
                  <div className="ipo-stat-label">{item.label}</div>
                  <div className="ipo-stat-value" style={item.blur ? blurStyle : undefined}>{item.value}</div>
                </div>
                <div className="ipo-stat-icon-box">
                  <Icon size={18} />
                </div>
              </div>
              <div className="ipo-muted-small">{item.note}</div>
            </div>
          );
        })}
      </div>

      {showForm && canWrite && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit Akun IPO' : 'Buat Akun IPO Baru'}</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Akun *</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Akun Utama / Akun Istri"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="contoh@gmail.com"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Simpan Perubahan' : 'Simpan Akun IPO'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div className="search-bar">
            <span className="search-bar-icon"><Icons.Search size={14} /></span>
            <input
              placeholder="Cari nama akun, email, atau kode IPO terkait..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {sortedRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.Users size={48} /></div>
          <div className="empty-state-title">Belum ada akun IPO</div>
          <div className="empty-state-desc">Buat registry akun IPO agar reuse akun antar event lebih rapi dan konsisten.</div>
          {canWrite && (
            <button className="btn btn-primary ipo-empty-cta" onClick={openCreate}>
              <Icons.Plus size={16} /> Tambah Akun IPO
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><SortableTableHeader label="Nama Akun" sortKey="name" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Total IPO" sortKey="eventCount" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Total Entry" sortKey="entryCount" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Lot" sortKey="totalRequestedLots" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Estimasi Modal" sortKey="totalCapital" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Terakhir Dipakai" sortKey="latestUsedAt" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th style={{ width: 220 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.name}</div>
                    <div className="ipo-cell-secondary">
                      {row.joinedEvents.length > 0
                        ? row.joinedEvents.slice(0, 3).map((event: IpoEvent) => event.stockCode).join(', ')
                        : 'Belum terhubung ke event IPO'}
                    </div>
                  </td>
                  <td className="ipo-cell-secondary">{row.email || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{row.eventCount} IPO</td>
                  <td style={{ fontWeight: 600 }}>{row.entryCount} entry</td>
                  <td style={{ fontWeight: 600 }}>{row.totalRequestedLots} lot</td>
                  <td style={blurStyle}>{formatRupiah(row.totalCapital)}</td>
                  <td>
                    <div>{formatDateTime(row.latestUsedAt)}</div>
                    <div className="ipo-cell-secondary">
                      {row.latestEvent ? `Terakhir di ${row.latestEvent.stockCode}` : 'Belum pernah dipakai'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {row.latestEvent && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/ipo/${row.latestEvent.id}`)}
                          style={{ padding: '4px 8px', height: 28 }}
                        >
                          Buka IPO
                        </button>
                      )}
                      {canWrite && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(row)}
                          style={{ padding: '4px 8px', height: 28 }}
                        >
                          Edit
                        </button>
                      )}
                      {canWrite && (
                        <button
                          className="btn btn-ghost btn-sm text-loss"
                          disabled={row.entryCount > 0}
                          title={row.entryCount > 0 ? 'Akun yang masih dipakai entry tidak bisa dihapus' : 'Hapus akun IPO'}
                          onClick={async () => {
                            if (row.entryCount > 0) {
                              await alert('Akun IPO ini masih dipakai oleh entry IPO. Hapus atau pindahkan entry terkait dulu jika ingin menghapus registry akun.', {
                                title: 'Akun IPO Masih Dipakai',
                                severity: 'warning',
                              });
                              return;
                            }
                            const approved = await confirm(`Hapus akun IPO "${row.name}"?`, {
                              title: 'Hapus Akun IPO',
                              severity: 'danger',
                              confirmText: 'Hapus',
                            });
                            if (approved) {
                              deleteIpoAccount(row.id);
                            }
                          }}
                          style={{ padding: '4px 6px', height: 28 }}
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
