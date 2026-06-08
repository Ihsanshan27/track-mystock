import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { USER_ROLES, listProfiles, updateProfileRole } from '@/modules/shared/services/profileService';
import { createAuditLog } from '@/modules/admin/services/auditLogService';
import { createUserAsAdmin } from '@/modules/admin/services/adminUserService';
import { getRegistrationEnabled, setRegistrationEnabled } from '@/modules/shared/services/appSettingsService';
import { formatDate } from '@/modules/shared/utils/formatters';

const ROLE_LABELS = {
  admin: 'Admin',
  mentor: 'Mentor',
  trader: 'Trader',
  viewer: 'Viewer',
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { showToast } = useData();
  const { refreshProfile } = usePermissions();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState('');
  const [registrationEnabled, setRegistrationEnabledState] = useState(true);
  const [settingLoading, setSettingLoading] = useState(true);
  const [settingSaving, setSettingSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'trader',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listProfiles();
      setProfiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRegistrationSetting = useCallback(async () => {
    setSettingLoading(true);
    try {
      const enabled = await getRegistrationEnabled();
      setRegistrationEnabledState(enabled);
    } catch (err) {
      showToast(`Gagal memuat pengaturan registrasi: ${err.message}`, 'error');
    } finally {
      setSettingLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
    loadRegistrationSetting();
  }, [loadUsers, loadRegistrationSetting]);

  const filteredProfiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return profiles;
    return profiles.filter(profile =>
      profile.email?.toLowerCase().includes(keyword) ||
      profile.displayName?.toLowerCase().includes(keyword) ||
      profile.role?.toLowerCase().includes(keyword)
    );
  }, [profiles, search]);

  const handleRoleChange = async (profile, role) => {
    if (profile.role === role) return;

    setSavingId(profile.id);
    try {
      const updated = await updateProfileRole(profile.id, role);
      setProfiles(prev => prev.map(item => item.id === profile.id ? updated : item));
      await createAuditLog({
        actorId: user?.id,
        action: 'profile.role_updated',
        targetType: 'profile',
        targetId: profile.id,
        metadata: {
          email: profile.email,
          from: profile.role,
          to: role,
        },
      });
      if (profile.id === user?.id) await refreshProfile();
      showToast(`Role ${profile.displayName} diperbarui`);
    } catch (err) {
      showToast(`Gagal update role: ${err.message}`, 'error');
    } finally {
      setSavingId('');
    }
  };

  const handleRegistrationToggle = async () => {
    const nextValue = !registrationEnabled;
    setSettingSaving(true);
    try {
      const saved = await setRegistrationEnabled(nextValue, user?.id);
      setRegistrationEnabledState(saved);
      await createAuditLog({
        actorId: user?.id,
        action: 'settings.registration_updated',
        targetType: 'app_settings',
        targetId: 'registration_enabled',
        metadata: { enabled: saved },
      });
      showToast(saved ? 'Form registrasi diaktifkan' : 'Form registrasi dinonaktifkan');
    } catch (err) {
      showToast(`Gagal update registrasi: ${err.message}`, 'error');
    } finally {
      setSettingSaving(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await createUserAsAdmin(createForm);
      setCreateForm({ email: '', displayName: '', password: '', role: 'trader' });
      setCreateOpen(false);
      showToast('User baru berhasil dibuat');
      await loadUsers();
    } catch (err) {
      showToast(`Gagal tambah user: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Kelola user, role, dan akses registrasi publik</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Tambah User
          </button>
          <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 16, alignItems: 'center' }}>
            <div className="search-bar">
              <span className="search-bar-icon">🔍</span>
              <input
                placeholder="Cari nama, email, atau role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className={`btn ${registrationEnabled ? 'btn-secondary' : 'btn-danger'}`}
              onClick={handleRegistrationToggle}
              disabled={settingLoading || settingSaving}
              title="Mengatur apakah halaman register publik bisa dipakai"
            >
              {registrationEnabled ? 'Registrasi Aktif' : 'Registrasi Nonaktif'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent-red)' }}>
          <div className="card-body" style={{ color: 'var(--accent-red)' }}>
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner" />
      ) : filteredProfiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">Belum ada user</div>
          <div className="empty-state-desc">User akan muncul setelah profile dibuat di Supabase.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(profile => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.displayName}</strong>
                    {profile.id === user?.id && (
                      <span className="badge badge-blue" style={{ marginLeft: 8 }}>Anda</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{profile.email || '-'}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(profile.role)}`}>
                      {ROLE_LABELS[profile.role] || profile.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {profile.createdAt ? formatDate(profile.createdAt) : '-'}
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ minWidth: 140 }}
                      value={profile.role}
                      disabled={savingId === profile.id}
                      onChange={e => handleRoleChange(profile, e.target.value)}
                    >
                      {USER_ROLES.map(role => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Tambah User</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setCreateOpen(false)}>x</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={createForm.email}
                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Tampilan</label>
                  <input
                    className="form-input"
                    value={createForm.displayName}
                    onChange={e => setCreateForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Opsional"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password Awal</label>
                  <input
                    type="password"
                    className="form-input"
                    value={createForm.password}
                    onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    minLength={6}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={createForm.role}
                    onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {USER_ROLES.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  User dibuat lewat Supabase Edge Function dan langsung dikonfirmasi, jadi bisa login tanpa email confirmation.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Membuat...' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getRoleBadgeClass(role) {
  if (role === 'admin') return 'badge-red';
  if (role === 'mentor') return 'badge-purple';
  if (role === 'viewer') return 'badge-blue';
  return 'badge-green';
}
