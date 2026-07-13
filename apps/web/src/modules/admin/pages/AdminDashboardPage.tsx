import { useCallback, useEffect, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { listAuditLogs } from '@/modules/admin/services/auditLogService';
import { listProfiles } from '@/modules/shared/services/profileService';
import { formatDateTime } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';
import { isApiConfigured } from '@/modules/shared/services/apiClient';

export default function AdminDashboardPage() {
  const { showToast } = useData();
  const [usersCount, setUsersCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let users = [];
      if (isApiConfigured) {
        users = await listProfiles();
      } else {
        // Fallback or read from localStorage if API is not configured
        const localUsers = localStorage.getItem('profiles');
        if (localUsers) users = JSON.parse(localUsers);
      }
      setUsersCount(users.length);

      const logRows = await listAuditLogs(5); // Get top 5 recent logs
      setRecentLogs(logRows);
    } catch (error: any) {
      showToast(`Gagal memuat data dasbor: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const todayLogsCount = recentLogs.filter((log: any) => {
    const logDate = new Date(log.createdAt || log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dasbor Admin</h1>
          <p className="page-subtitle">Ringkasan aktivitas dan metrik sistem Jurnal Saham</p>
        </div>
        <button className="btn btn-secondary" onClick={loadDashboardData} disabled={loading}>
          <Icons.RefreshCw size={16} className={loading ? 'spin' : ''} style={{ marginRight: '6px' }} />
          Refresh
        </button>
      </div>

      <div className="grid-stats" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)', borderRadius: '12px' }}>
              <Icons.Users size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Pengguna</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? '-' : usersCount}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)', borderRadius: '12px' }}>
              <Icons.Activity size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aktivitas Hari Ini (Top 5)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? '-' : todayLogsCount}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--accent-green-dim)', color: 'var(--accent-green)', borderRadius: '12px' }}>
              <Icons.ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status Sistem</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                {loading ? '-' : 'Aman'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>Aktivitas Terbaru</h2>
      
      {loading ? (
        <div className="loading-spinner" />
      ) : recentLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.ScrollText size={48} /></div>
          <div className="empty-state-title">Belum ada aktivitas</div>
          <div className="empty-state-desc">Belum ada log yang tercatat di sistem.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Actor</th>
                <th>Aktivitas</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log: any) => (
                <tr key={log.id}>
                  <td className="admin-audit-time-cell">{formatDateTime(log.createdAt || log.created_at)}</td>
                  <td>
                    <strong>{log.actorId || log.actor_id || 'System'}</strong>
                  </td>
                  <td>
                    <span className="badge badge-purple">{log.action}</span>
                  </td>
                  <td>
                    <div>{log.targetType || log.target_type || '-'}</div>
                    <div className="admin-audit-subtext">{log.targetId || log.target_id || '-'}</div>
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
