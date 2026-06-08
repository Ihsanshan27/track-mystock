import { useEffect, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { listProfiles } from '@/modules/shared/services/profileService';
import { ACCESS_LEVELS, listOwnedSharedAccess, revokeSharedAccess, upsertSharedAccess } from '@/modules/shared/services/sharedAccessService';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { formatDateTime, formatRupiah } from '@/modules/shared/utils/formatters';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';

const ACCESS_LABELS = {
  read: 'Read Only',
  review: 'Review Mentor',
  admin: 'Admin Share',
};

export default function SettingsPage() {
  const { settings, updateSettings, showToast, exportData, importData, clearData } = useData();
  const { user, updateUsername, logout } = useAuth();
  const { roleLabel, roleError, refreshProfile, can } = usePermissions();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [form, setForm] = useState({ ...settings });
  const [allProfiles, setAllProfiles] = useState([]);
  const [sharedAccessRows, setSharedAccessRows] = useState([]);
  const [shareLoading, setShareLoading] = useState(true);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareForm, setShareForm] = useState({
    granteeId: '',
    accessLevel: 'review',
    expiresAt: '',
  });

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSharingData() {
      if (!can('share:journal') || !user?.id || !isSupabaseConfigured) {
        setAllProfiles([]);
        setSharedAccessRows([]);
        setShareLoading(false);
        return;
      }

      setShareLoading(true);
      try {
        const [profiles, accessRows] = await Promise.all([
          listProfiles(),
          listOwnedSharedAccess(user.id),
        ]);
        if (cancelled) return;
        setAllProfiles(profiles.filter((item) => item.id !== user.id));
        setSharedAccessRows(accessRows);
      } catch (error) {
        if (!cancelled) showToast(`Gagal memuat data sharing: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    }

    loadSharingData();
    return () => {
      cancelled = true;
    };
  }, [can, showToast, user?.id]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSaveSettings = () => {
    updateSettings({
      initialCapital: parseFloat(form.initialCapital) || 10000000,
      monthlyTarget: parseFloat(form.monthlyTarget) || 5,
      defaultBuyFee: parseFloat(form.defaultBuyFee) || 0.15,
      defaultSellFee: parseFloat(form.defaultSellFee) || 0.25,
      initialCapitalUS: parseFloat(form.initialCapitalUS) || 1000,
      defaultBuyFeeUS: parseFloat(form.defaultBuyFeeUS) || 0,
      defaultSellFeeUS: parseFloat(form.defaultSellFeeUS) || 0,
    });
  };

  const handleSaveUsername = async () => {
    if (newUsername.trim().length >= 3) {
      const result = await updateUsername(newUsername.trim());
      if (result?.success === false) {
        showToast(result.error, 'error');
      } else {
        await refreshProfile();
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'profile.display_name_updated',
          targetType: 'profile',
          targetId: user?.id,
          metadata: { displayName: newUsername.trim() },
        });
        showToast('Profil diperbarui');
      }
    }
  };

  const handleExport = () => {
    const data = exportData(user?.id);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-saham-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    createAuditLogSafe({
      actorId: user?.id,
      action: 'data.exported',
      targetType: 'journal_data',
      targetId: user?.id,
      metadata: { storage: data.storage, version: data.version },
    });
    showToast('Data berhasil diexport');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result as string);
        await importData(data, user?.id);
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'data.imported',
          targetType: 'journal_data',
          targetId: user?.id,
          metadata: { version: data.version || 'unknown' },
        });
        showToast('Data berhasil diimport! Refresh halaman untuk melihat perubahan.');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        showToast('Format file tidak valid', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('PERINGATAN: Semua data transaksi, watchlist, dan catatan akan dihapus permanen. Lanjutkan?')) {
      clearData(user?.id)
        .then(async () => {
          await createAuditLogSafe({
            actorId: user?.id,
            action: 'data.cleared',
            targetType: 'journal_data',
            targetId: user?.id,
          });
          showToast('Semua data telah dihapus');
          setTimeout(() => window.location.reload(), 1000);
        })
        .catch((error) => showToast(error.message, 'error'));
    }
  };

  const handleSaveShare = async () => {
    if (!shareForm.granteeId) return;

    setShareSaving(true);
    try {
      const row = await upsertSharedAccess({
        ownerId: user.id,
        granteeId: shareForm.granteeId,
        accessLevel: shareForm.accessLevel,
        expiresAt: shareForm.expiresAt ? new Date(shareForm.expiresAt).toISOString() : null,
      });
      await createAuditLogSafe({
        actorId: user.id,
        action: 'shared_access.upserted',
        targetType: 'shared_access',
        targetId: row.id,
        metadata: {
          granteeId: row.grantee_id,
          accessLevel: row.access_level,
        },
      });
      setSharedAccessRows((prev) => {
        const existing = prev.find((item) => item.id === row.id || item.grantee_id === row.grantee_id);
        if (!existing) return [row, ...prev];
        return prev.map((item) => item.id === existing.id ? row : item);
      });
      setShareForm({ granteeId: '', accessLevel: 'review', expiresAt: '' });
      showToast('Akses jurnal berhasil diperbarui.');
    } catch (error) {
      showToast(`Gagal menyimpan akses: ${error.message}`, 'error');
    } finally {
      setShareSaving(false);
    }
  };

  const handleRevokeShare = async (row) => {
    if (!window.confirm('Cabut akses user ini dari jurnal Anda?')) return;

    try {
      await revokeSharedAccess(row.id);
      await createAuditLogSafe({
        actorId: user.id,
        action: 'shared_access.revoked',
        targetType: 'shared_access',
        targetId: row.id,
        metadata: {
          granteeId: row.grantee_id,
        },
      });
      setSharedAccessRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast('Akses berhasil dicabut.');
    } catch (error) {
      showToast(`Gagal mencabut akses: ${error.message}`, 'error');
    }
  };

  const profileById = allProfiles.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Pengaturan</h1>
          <p className="page-subtitle">Kelola profil, preferensi, dan data Anda</p>
        </div>
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* Profile */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">👤 Profil</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nama Tampilan</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                <button className="btn btn-secondary" onClick={handleSaveUsername}>Simpan</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <div className="badge badge-blue">{roleLabel}</div>
              {roleError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginTop: 8 }}>
                  Role fallback aktif: {roleError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trading Settings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">📈 Pengaturan Trading</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal (Rp)</label>
                <CurrencyInput
                  value={String(form.initialCapital ?? '')}
                  onChange={v => set('initialCapital', v)}
                  placeholder="10.000.000"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Saat ini: {formatRupiah(settings.initialCapital)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Profit Bulanan (%)</label>
                <input type="number" className="form-input" step="0.1" value={form.monthlyTarget} onChange={e => set('monthlyTarget', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Default Fee Beli (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultBuyFee} onChange={e => set('defaultBuyFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Fee Jual (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultSellFee} onChange={e => set('defaultSellFee', e.target.value)} />
              </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', fontSize: '1.1rem' }}>🌎 Pasar US (Gotrade)</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal US ($)</label>
                <CurrencyInput
                  value={String(form.initialCapitalUS ?? '')}
                  onChange={v => set('initialCapitalUS', v)}
                  placeholder="1.000"
                  allowDecimal={true}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Saat ini: ${settings.initialCapitalUS || 1000}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Default Fee Beli US (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultBuyFeeUS} onChange={e => set('defaultBuyFeeUS', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Fee Jual US (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultSellFeeUS} onChange={e => set('defaultSellFeeUS', e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Pengaturan</button>
          </div>
        </div>

        {can('share:journal') ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3 className="card-title">🤝 Share Jurnal ke Mentor / Viewer</h3></div>
            <div className="card-body">
              {!isSupabaseConfigured ? (
                <div style={{ color: 'var(--accent-yellow)' }}>
                  Fitur sharing jurnal butuh Supabase aktif.
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Pilih User</label>
                      <select
                        className="form-select"
                        value={shareForm.granteeId}
                        onChange={(event) => setShareForm((prev) => ({ ...prev, granteeId: event.target.value }))}
                      >
                        <option value="">Pilih mentor / viewer</option>
                        {allProfiles
                          .filter((item) => item.role === 'mentor' || item.role === 'viewer' || item.role === 'admin')
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.displayName} ({item.role})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Level Akses</label>
                      <select
                        className="form-select"
                        value={shareForm.accessLevel}
                        onChange={(event) => setShareForm((prev) => ({ ...prev, accessLevel: event.target.value }))}
                      >
                        {ACCESS_LEVELS.map((level) => (
                          <option key={level} value={level}>{ACCESS_LABELS[level] || level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Berakhir Akses (opsional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={shareForm.expiresAt}
                      onChange={(event) => setShareForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveShare}
                    disabled={shareSaving || !shareForm.granteeId}
                  >
                    {shareSaving ? 'Menyimpan...' : 'Simpan Akses'}
                  </button>

                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 12 }}>Akses Aktif</h4>
                    {shareLoading ? (
                      <div style={{ color: 'var(--text-muted)' }}>Memuat akses sharing...</div>
                    ) : sharedAccessRows.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)' }}>Belum ada user yang diberi akses.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {sharedAccessRows.map((row) => {
                          const itemProfile = profileById[row.grantee_id];
                          return (
                            <div
                              key={row.id}
                              style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 14,
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {itemProfile?.displayName || itemProfile?.email || row.grantee_id}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
                                  {itemProfile?.role || 'user'} · {ACCESS_LABELS[row.access_level] || row.access_level}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
                                  Dibuat {formatDateTime(row.created_at)}
                                  {row.expires_at ? ` · berakhir ${formatDateTime(row.expires_at)}` : ''}
                                </div>
                              </div>
                              <div>
                                <button className="btn btn-danger btn-sm" onClick={() => handleRevokeShare(row)}>
                                  Cabut Akses
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Data Management */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">💾 Manajemen Data</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn btn-secondary" onClick={handleExport}>
                📤 Export Data (JSON)
              </button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                📥 Import Data
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
              <div style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                ⚠️ Zona Bahaya
              </div>
              <button className="btn btn-danger" onClick={handleClearData}>
                🗑 Hapus Semua Data
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🚪 Akun</h3></div>
          <div className="card-body">
            <button className="btn btn-secondary" onClick={logout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
