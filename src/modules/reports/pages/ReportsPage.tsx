import { useEffect, useMemo, useState } from 'react';
import ReportView from '@/modules/reports/components/ReportView';
import ReadOnlyNotice from '@/modules/shared/components/ReadOnlyNotice';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { createReportShare, deleteReportShare, listReportShares, updateReportShare } from '@/modules/shared/services/reportShareService';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { buildReportSnapshot } from '@/modules/shared/utils/reporting';
import { formatDateTime } from '@/modules/shared/utils/formatters';

export default function ReportsPage() {
  const { trades, cashflows, dividends, settings, marketPrices, showToast } = useData();
  const { profile, roleLabel } = usePermissions();
  const { alert, confirm } = useDialog();
  const [market, setMarket] = useState('ID');
  const [shareTitle, setShareTitle] = useState('Report Portfolio');
  const [shareRows, setShareRows] = useState([]);
  const [shareLoading, setShareLoading] = useState(true);
  const [shareSaving, setShareSaving] = useState(false);

  const reportSnapshot = useMemo(() => buildReportSnapshot({
    trades,
    cashflows,
    dividends,
    settings,
    marketPrices,
    market,
    ownerName: profile?.displayName || profile?.email || 'User',
  }), [cashflows, dividends, market, marketPrices, profile, settings, trades]);

  useEffect(() => {
    setShareTitle(`Report ${market === 'US' ? 'Pasar Amerika' : 'Pasar Indonesia'}`);
  }, [market]);

  useEffect(() => {
    let cancelled = false;

    async function loadShares() {
      if (!isSupabaseConfigured || !profile?.id) {
        setShareRows([]);
        setShareLoading(false);
        return;
      }

      setShareLoading(true);
      try {
        const rows = await listReportShares(profile.id);
        if (!cancelled) setShareRows(rows);
      } catch (error) {
        if (!cancelled) showToast(`Gagal memuat link report: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    }

    loadShares();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, showToast]);

  const handleCreateShare = async () => {
    setShareSaving(true);
    try {
      const row = await createReportShare({
        owner_id: profile.id,
        title: shareTitle.trim() || 'Report Portfolio',
        market,
        report_data: reportSnapshot,
      });
      await createAuditLogSafe({
        actorId: profile.id,
        action: 'report_share.created',
        targetType: 'report_share',
        targetId: row.id,
        metadata: { title: row.title, market: row.market },
      });
      setShareRows((prev) => [row, ...prev]);
      showToast('Link report berhasil dibuat.');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setShareSaving(false);
    }
  };

  const handleRefreshShare = async (shareId) => {
    try {
      const updated = await updateReportShare(shareId, {
        title: shareTitle.trim() || 'Report Portfolio',
        market,
        report_data: reportSnapshot,
        is_active: true,
      });
      await createAuditLogSafe({
        actorId: profile?.id,
        action: 'report_share.snapshot_refreshed',
        targetType: 'report_share',
        targetId: shareId,
        metadata: { title: updated.title, market: updated.market },
      });
      setShareRows((prev) => prev.map((row) => row.id === shareId ? updated : row));
      showToast('Snapshot report berhasil diperbarui.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleToggleShare = async (shareId, nextState) => {
    try {
      const updated = await updateReportShare(shareId, { is_active: nextState });
      await createAuditLogSafe({
        actorId: profile?.id,
        action: 'report_share.visibility_updated',
        targetType: 'report_share',
        targetId: shareId,
        metadata: { isActive: nextState },
      });
      setShareRows((prev) => prev.map((row) => row.id === shareId ? updated : row));
      showToast(nextState ? 'Link report diaktifkan kembali.' : 'Link report dinonaktifkan.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteShare = async (shareId) => {
    const isConfirmed = await confirm('Hapus link report ini? Link yang sudah dibagikan akan berhenti bekerja.', {
      title: 'Hapus Link Report',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (!isConfirmed) return;

    try {
      await deleteReportShare(shareId);
      await createAuditLogSafe({
        actorId: profile?.id,
        action: 'report_share.deleted',
        targetType: 'report_share',
        targetId: shareId,
      });
      setShareRows((prev) => prev.filter((row) => row.id !== shareId));
      showToast('Link report dihapus.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCopyLink = async (shareId) => {
    const shareUrl = `${window.location.origin}/shared/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      await createAuditLogSafe({
        actorId: profile?.id,
        action: 'report_share.link_copied',
        targetType: 'report_share',
        targetId: shareId,
        metadata: { shareUrl },
      });
      showToast('Link report disalin ke clipboard.');
    } catch {
      await alert(`Gagal menyalin otomatis. Silakan salin link berikut secara manual:\n\n${shareUrl}`, {
        title: 'Salin Link Report',
        severity: 'info'
      });
    }
  };

  return (
    <div>
      <ReadOnlyNotice
        title={`Akses ${roleLabel}`}
        description="Halaman ini hanya membuat snapshot read-only. Data jurnal asli tetap mengikuti izin role dan RLS Supabase."
      />
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Bagikan Report Read-Only</h3></div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Market</label>
              <select className="form-input" value={market} onChange={(event) => setMarket(event.target.value)}>
                <option value="ID">Pasar Indonesia</option>
                <option value="US">Pasar Amerika</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Judul Share</label>
              <input
                className="form-input"
                value={shareTitle}
                onChange={(event) => setShareTitle(event.target.value)}
                placeholder="Contoh: Report Mei 2026"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleCreateShare}
              disabled={!isSupabaseConfigured || shareSaving}
            >
              {shareSaving ? 'Membuat...' : 'Buat Link Share'}
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              Export PDF
            </button>
          </div>

          {!isSupabaseConfigured ? (
            <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--accent-yellow)' }}>
              Share link publik butuh Supabase aktif. Preview report tetap bisa dipakai secara lokal.
            </div>
          ) : null}
        </div>
      </div>

      <ReportView
        report={reportSnapshot}
        title={shareTitle}
        emptyMessage="Belum ada data untuk dibuatkan report."
      />

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header"><h3 className="card-title">Daftar Link Report</h3></div>
        <div className="card-body">
          {shareLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>Memuat link report...</div>
          ) : shareRows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Belum ada link report yang dibuat.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {shareRows.map((row) => (
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
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
                      {row.market === 'US' ? 'Pasar Amerika' : 'Pasar Indonesia'} · dibuat {formatDateTime(row.created_at)}
                    </div>
                    <div style={{ color: row.is_active ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
                      {row.is_active ? 'Aktif' : 'Nonaktif'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleCopyLink(row.id)}>Salin Link</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleRefreshShare(row.id)}>Refresh Snapshot</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggleShare(row.id, !row.is_active)}>
                      {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteShare(row.id)}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
