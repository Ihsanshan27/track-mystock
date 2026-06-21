import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { listAuditLogs, cleanOldAuditLogs } from '@/modules/admin/services/auditLogService';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { listProfiles } from '@/modules/shared/services/profileService';
import { formatDateTime } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';

const ACTION_LABELS = {
  'auth.registered': 'User mendaftar',
  'auth.logged_in': 'User login',
  'auth.logged_out': 'User logout',
  'trade.created': 'Membuat transaksi',
  'trade.updated': 'Mengubah transaksi',
  'trade.deleted': 'Menghapus transaksi',
  'watchlist.created': 'Menambah watchlist',
  'watchlist.deleted': 'Menghapus watchlist',
  'note.created': 'Membuat catatan',
  'note.deleted': 'Menghapus catatan',
  'cashflow.created': 'Mencatat cashflow',
  'cashflow.updated': 'Mengubah cashflow',
  'cashflow.deleted': 'Menghapus cashflow',
  'dividend.created': 'Mencatat dividen',
  'dividend.deleted': 'Menghapus dividen',
  'portfolio.created': 'Membuat portofolio',
  'portfolio.updated': 'Mengubah portofolio',
  'portfolio.deleted': 'Menghapus portofolio',
  'trading_plan.created': 'Membuat trading plan',
  'trading_plan.deleted': 'Menghapus trading plan',
  'ipo_event.created': 'Membuat event IPO',
  'ipo_event.updated': 'Mengubah event IPO',
  'ipo_event.deleted': 'Menghapus event IPO',
  'ipo_entry.created': 'Menambah entry IPO',
  'ipo_entry.updated': 'Mengubah entry IPO',
  'ipo_entry.deleted': 'Menghapus entry IPO',
  'bsjp_trade.created': 'Membuat transaksi BSJP',
  'bsjp_trade.updated': 'Mengubah transaksi BSJP',
  'bsjp_trade.deleted': 'Menghapus transaksi BSJP',
  'settings.updated': 'Mengubah pengaturan',
  'settings.registration_updated': 'Mengubah status registrasi',
  'profile.display_name_updated': 'Mengubah nama tampilan',
  'profile.role_updated': 'Mengubah role user',
  'workspace.created': 'Membuat workspace',
  'workspace.member_upserted': 'Menambah atau mengubah member workspace',
  'workspace.member_removed': 'Menghapus member workspace',
  'admin.user_created': 'Admin membuat user',
  'data.exported': 'Export data',
  'data.imported': 'Import data',
  'data.cleared': 'Menghapus semua data',
  'shared_access.upserted': 'Membuat atau mengubah akses sharing',
  'shared_access.revoked': 'Mencabut akses sharing',
  'report_share.created': 'Membuat link report',
  'report_share.snapshot_refreshed': 'Refresh snapshot report',
  'report_share.visibility_updated': 'Mengubah visibilitas report',
  'report_share.deleted': 'Menghapus link report',
  'report_share.link_copied': 'Menyalin link report',
};

const TARGET_TYPE_LABELS = {
  auth_user: 'User',
  trade: 'Transaksi',
  watchlist_item: 'Watchlist',
  note: 'Catatan',
  cashflow: 'Cashflow',
  dividend: 'Dividen',
  portfolio: 'Portofolio',
  trading_plan: 'Trading Plan',
  ipo_event: 'Event IPO',
  ipo_entry: 'Entry IPO',
  bsjp_trade: 'Transaksi BSJP',
  settings: 'Pengaturan',
  profile: 'Profil',
  workspace: 'Workspace',
  app_settings: 'App Settings',
  shared_access: 'Shared Access',
  report_share: 'Report Share',
  journal_data: 'Data Jurnal',
};

export default function AdminAuditLogsPage() {
  const { showToast, settings } = useData();
  const [logs, setLogs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const profileById = useMemo(() => {
    return profiles.reduce((profilesMap, profile) => {
      profilesMap[profile.id] = profile;
      return profilesMap;
    }, {});
  }, [profiles]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return logs;

    return logs.filter(log => {
      const actor = profileById[log.actor_id];
      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.target_type,
        getTargetTypeLabel(log.target_type),
        log.target_id,
        actor?.email,
        actor?.displayName,
        JSON.stringify(log.metadata || {}),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [logs, profileById, search]);
  const { sortConfig, sortedItems: sortedLogs, requestSort } = useTableSort(filteredLogs, {
    initialKey: 'created_at',
    initialDirection: 'desc',
    getValue: (log: any, key: 'created_at' | 'actor' | 'action' | 'target' | 'detail') => {
      const actor = profileById[log.actor_id];
      if (key === 'actor') return actor?.displayName || actor?.email || log.actor_id || 'System';
      if (key === 'target') return `${log.target_type || ''} ${log.target_id || ''}`;
      if (key === 'detail') return JSON.stringify(log.metadata || {});
      return log[key] || '';
    },
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const retentionDays = parseInt(settings.logRetentionDays) || 0;
      if (retentionDays > 0) {
        try {
          const deletedCount = await cleanOldAuditLogs(retentionDays);
          if (deletedCount > 0) {
            showToast(`${deletedCount} audit log lama dibersihkan`);
          }
        } catch (cleanError: any) {
          showToast(`Gagal membersihkan log usang: ${cleanError.message}`, 'error');
        }
      }
      const [logRows, profileRows] = await Promise.all([
        listAuditLogs(150),
        listProfiles(),
      ]);
      setLogs(logRows);
      setProfiles(profileRows);
    } catch (error) {
      showToast(`Gagal memuat audit log: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, settings.logRetentionDays]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Pantau aktivitas penting user dan admin</p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>Refresh</button>
      </div>

      <div className="card admin-card-spaced">
        <div className="card-body">
          <div className="search-bar">
            <span className="search-bar-icon"><Icons.Search size={14} /></span>
            <input
              placeholder="Cari aktivitas, user, target, atau metadata..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.ScrollText size={48} /></div>
          <div className="empty-state-title">Belum ada audit log</div>
          <div className="empty-state-desc">Aktivitas user dan admin akan muncul di sini.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><SortableTableHeader label="Waktu" sortKey="created_at" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Actor" sortKey="actor" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Aktivitas" sortKey="action" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Target" sortKey="target" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Detail" sortKey="detail" sortConfig={sortConfig} onSort={requestSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map(log => {
                const actor = profileById[log.actor_id];
                const metadataEntries = Object.entries(log.metadata || {});
                return (
                  <tr key={log.id}>
                    <td className="admin-audit-time-cell">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <strong>{actor?.displayName || 'System'}</strong>
                      <div className="admin-audit-subtext">
                        {actor?.email || log.actor_id || '-'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{getActionLabel(log.action)}</span>
                      <div className="admin-audit-action-code">
                        {log.action}
                      </div>
                    </td>
                    <td>
                      <div>{getTargetTypeLabel(log.target_type)}</div>
                      <div className="admin-audit-subtext">{log.target_id || '-'}</div>
                    </td>
                    <td>
                      {metadataEntries.length === 0 ? (
                        <span className="admin-empty-note">Tidak ada detail</span>
                      ) : (
                        <div className="admin-audit-detail-grid">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="admin-audit-detail-row">
                              <strong>{formatMetadataKey(key)}:</strong>{' '}
                              <span className="admin-table-secondary">{formatMetadataValue(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function getTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-';
}

function formatMetadataKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, character => character.toUpperCase());
}

function formatMetadataValue(value) {
  if (value == null || value === '') return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  return String(value);
}

