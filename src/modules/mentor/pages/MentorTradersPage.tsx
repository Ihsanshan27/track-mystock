import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReadOnlyNotice from '@/modules/shared/components/ReadOnlyNotice';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useData } from '@/modules/shared/context/DataContext';
import { listProfilesByIds } from '@/modules/shared/services/profileService';
import { listGrantedSharedAccess } from '@/modules/shared/services/sharedAccessService';
import { formatDateTime } from '@/modules/shared/utils/formatters';

const ACCESS_LABELS = {
  read: 'Read Only',
  review: 'Review',
  admin: 'Admin',
};

export default function MentorTradersPage() {
  const { profile } = usePermissions();
  const { showToast } = useData();
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const profileById = useMemo(() => {
    return profiles.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [profiles]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!profile?.id) {
        setRows([]);
        setProfiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const accessRows = await listGrantedSharedAccess(profile.id);
        const ownerProfiles = await listProfilesByIds(accessRows.map((row) => row.owner_id));
        if (cancelled) return;
        setRows(accessRows);
        setProfiles(ownerProfiles);
      } catch (error) {
        if (!cancelled) showToast(`Gagal memuat daftar trader: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, showToast]);

  return (
    <div>
      <ReadOnlyNotice
        title="Akses Mentor"
        description="Trader yang tampil di sini adalah user yang memberi Anda akses baca atau review ke jurnal mereka."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">Trader Shared Access</h1>
          <p className="page-subtitle">Lihat trader yang membagikan jurnalnya ke Anda</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Daftar Trader</h3></div>
        <div className="card-body">
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Memuat daftar trader...</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Belum ada trader yang share jurnal</div>
              <div className="empty-state-desc">Minta trader memberi akses dari halaman Pengaturan mereka.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map((row) => {
                const trader = profileById[row.owner_id];
                return (
                  <div
                    key={row.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {trader?.displayName || trader?.email || row.owner_id}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
                        {trader?.email || 'Tanpa email'} · akses {ACCESS_LABELS[row.access_level] || row.access_level}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
                        Dibagikan {formatDateTime(row.created_at)}
                        {row.expires_at ? ` · berakhir ${formatDateTime(row.expires_at)}` : ''}
                      </div>
                    </div>
                    <div>
                      <Link to={`/mentor/traders/${row.owner_id}`} className="btn btn-primary btn-sm">
                        Lihat Jurnal
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
