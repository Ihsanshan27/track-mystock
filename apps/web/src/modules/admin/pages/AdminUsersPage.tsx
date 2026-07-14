import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { USER_ROLES, listProfiles, updateProfileRole } from '@/modules/shared/services/profileService';
import { createAuditLog, createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { createUserAsAdmin } from '@/modules/admin/services/adminUserService';
import { getRegistrationEnabled, setRegistrationEnabled } from '@/modules/shared/services/appSettingsService';
import { formatDate } from '@/modules/shared/utils/formatters';
import CustomSelect from '@/modules/shared/components/CustomSelect';

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
  const { sortConfig, sortedItems: sortedProfiles, requestSort } = useTableSort(filteredProfiles, {
    initialKey: 'displayName',
    getValue: (profile: any, key: 'displayName' | 'email' | 'role' | 'createdAt') => profile[key] || '',
  });

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
      const createdUser = await createUserAsAdmin(createForm);
      await createAuditLogSafe({
        actorId: user?.id,
        action: 'admin.user_created',
        targetType: 'profile',
        targetId: createdUser?.user?.id || createdUser?.id || createForm.email,
        metadata: {
          email: createForm.email,
          displayName: createForm.displayName || null,
          role: createForm.role,
        },
      });
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
        <div className="admin-page-actions">
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Tambah User
          </button>
          <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card admin-card-spaced">
        <div className="card-body">
          <div className="admin-users-toolbar">
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
        <div className="card admin-card-spaced admin-card-error">
          <div className="card-body admin-error-text">
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
          <div className="empty-state-desc">User akan muncul setelah profile berhasil dibuat di backend.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><SortableTableHeader label="User" sortKey="displayName" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Role" sortKey="role" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Dibuat" sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map(profile => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.displayName}</strong>
                    {profile.id === user?.id && (
                      <span className="badge badge-blue admin-inline-badge">Anda</span>
                    )}
                  </td>
                  <td className="admin-table-secondary">{profile.email || '-'}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(profile.role)}`}>
                      {ROLE_LABELS[profile.role] || profile.role}
                    </span>
                  </td>
                  <td className="admin-table-meta">
                    {profile.createdAt ? formatDate(profile.createdAt) : '-'}
                  </td>
                  <td>
                    <CustomSelect
                      className="form-select admin-role-select"
                      title={`Ubah role untuk ${profile.displayName || profile.email || 'user'}`}
                      aria-label={`Ubah role untuk ${profile.displayName || profile.email || 'user'}`}
                      value={profile.role}
                      disabled={savingId === profile.id || profile.id === user?.id}
                      onChange={e => handleRoleChange(profile, e.target.value)}
                    >
                      {USER_ROLES.map(role => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </CustomSelect>
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
              <button
                className="btn btn-ghost btn-icon"
                type="button"
                aria-label="Tutup modal tambah user"
                title="Tutup modal tambah user"
                onClick={() => setCreateOpen(false)}
              >
                x
              </button>
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
                  <CustomSelect
                    className="form-select"
                    title="Pilih role user baru"
                    aria-label="Pilih role user baru"
                    value={createForm.role}
                    onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {USER_ROLES.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </CustomSelect>
                </div>
                <div className="admin-form-note">
                  User dibuat langsung lewat backend admin flow dan bisa login memakai kredensial yang diberikan.
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
