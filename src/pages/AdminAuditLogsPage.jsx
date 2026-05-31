import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { listAuditLogs } from '../services/auditLogService';
import { listProfiles } from '../services/profileService';
import { formatDateTime } from '../utils/formatters';

export default function AdminAuditLogsPage() {
  const { showToast } = useData();
  const [logs, setLogs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const profileById = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }, [profiles]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return logs;

    return logs.filter(log => {
      const actor = profileById[log.actor_id];
      const haystack = [
        log.action,
        log.target_type,
        log.target_id,
        actor?.email,
        actor?.displayName,
        JSON.stringify(log.metadata || {}),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [logs, profileById, search]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logRows, profileRows] = await Promise.all([
        listAuditLogs(150),
        listProfiles(),
      ]);
      setLogs(logRows);
      setProfiles(profileRows);
    } catch (err) {
      showToast(`Gagal memuat audit log: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="search-bar">
            <span className="search-bar-icon">🔍</span>
            <input
              placeholder="Cari action, user, target, atau metadata..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-title">Belum ada audit log</div>
          <div className="empty-state-desc">Aktivitas admin akan muncul di sini.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const actor = profileById[log.actor_id];
                return (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <strong>{actor?.displayName || 'System'}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {actor?.email || log.actor_id || '-'}
                      </div>
                    </td>
                    <td><span className="badge badge-purple">{log.action}</span></td>
                    <td>
                      <div>{log.target_type || '-'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{log.target_id || '-'}</div>
                    </td>
                    <td>
                      <pre style={{
                        margin: 0,
                        maxWidth: 360,
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                      }}>
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
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
