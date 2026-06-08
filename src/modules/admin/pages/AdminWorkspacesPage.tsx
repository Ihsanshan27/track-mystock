import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { listProfiles } from '@/modules/shared/services/profileService';
import { createAuditLog } from '@/modules/admin/services/auditLogService';
import {
  WORKSPACE_ROLES,
  createWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceMember,
  upsertWorkspaceMember,
} from '@/modules/admin/services/workspaceService';
import { formatDate } from '@/modules/shared/utils/formatters';

const ROLE_LABELS = {
  admin: 'Admin',
  mentor: 'Mentor',
  trader: 'Trader',
  viewer: 'Viewer',
};

export default function AdminWorkspacesPage() {
  const { user } = useAuth();
  const { showToast } = useData();
  const [workspaces, setWorkspaces] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'trader' });
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeWorkspace = useMemo(
    () => workspaces.find(workspace => workspace.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  );

  const profileById = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }, [profiles]);

  const loadMembers = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    try {
      const rows = await listWorkspaceMembers(workspaceId);
      setMembers(rows);
    } catch (err) {
      showToast(`Gagal memuat member: ${err.message}`, 'error');
    } finally {
      setMembersLoading(false);
    }
  }, [showToast]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [workspaceRows, profileRows] = await Promise.all([
        listWorkspaces(),
        listProfiles(),
      ]);
      setWorkspaces(workspaceRows);
      setProfiles(profileRows);
      const firstWorkspaceId = workspaceRows[0]?.id || '';
      setActiveWorkspaceId(firstWorkspaceId);
      if (firstWorkspaceId) await loadMembers(firstWorkspaceId);
    } catch (err) {
      showToast(`Gagal memuat workspace: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadMembers, showToast]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleWorkspaceChange = async (workspaceId) => {
    setActiveWorkspaceId(workspaceId);
    await loadMembers(workspaceId);
  };

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();
    if (!workspaceName.trim()) return;

    setSaving(true);
    try {
      const workspace = await createWorkspace({ name: workspaceName.trim(), ownerId: user?.id });
      await upsertWorkspaceMember({ workspaceId: workspace.id, userId: user?.id, role: 'admin' });
      await createAuditLog({
        actorId: user?.id,
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: workspace.id,
        metadata: { name: workspace.name },
      });
      setWorkspaceName('');
      setWorkspaces(prev => [workspace, ...prev]);
      setActiveWorkspaceId(workspace.id);
      await loadMembers(workspace.id);
      showToast('Workspace berhasil dibuat');
    } catch (err) {
      showToast(`Gagal buat workspace: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!activeWorkspaceId || !memberForm.userId) return;

    setSaving(true);
    try {
      await upsertWorkspaceMember({
        workspaceId: activeWorkspaceId,
        userId: memberForm.userId,
        role: memberForm.role,
      });
      await createAuditLog({
        actorId: user?.id,
        action: 'workspace.member_upserted',
        targetType: 'workspace',
        targetId: activeWorkspaceId,
        metadata: {
          userId: memberForm.userId,
          role: memberForm.role,
        },
      });
      setMemberForm({ userId: '', role: 'trader' });
      await loadMembers(activeWorkspaceId);
      showToast('Member workspace diperbarui');
    } catch (err) {
      showToast(`Gagal invite member: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const memberProfile = profileById[member.user_id];
    if (!window.confirm(`Hapus ${memberProfile?.displayName || 'member'} dari workspace?`)) return;

    try {
      await removeWorkspaceMember(member.id);
      await createAuditLog({
        actorId: user?.id,
        action: 'workspace.member_removed',
        targetType: 'workspace',
        targetId: member.workspace_id,
        metadata: {
          userId: member.user_id,
          role: member.role,
        },
      });
      await loadMembers(activeWorkspaceId);
      showToast('Member dihapus dari workspace');
    } catch (err) {
      showToast(`Gagal hapus member: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Management</h1>
          <p className="page-subtitle">Buat workspace dan kelola member komunitas</p>
        </div>
        <button className="btn btn-secondary" onClick={loadInitial} disabled={loading}>Refresh</button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Buat Workspace</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreateWorkspace}>
              <div className="form-group">
                <label className="form-label">Nama Workspace</label>
                <input
                  className="form-input"
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  placeholder="Contoh: Komunitas Swing Trader"
                />
              </div>
              <button className="btn btn-primary" disabled={saving || !workspaceName.trim()}>
                Buat Workspace
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Invite Member</h3></div>
          <div className="card-body">
            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label className="form-label">Workspace</label>
                <select
                  className="form-select"
                  value={activeWorkspaceId}
                  onChange={e => handleWorkspaceChange(e.target.value)}
                >
                  <option value="">Pilih workspace</option>
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">User</label>
                <select
                  className="form-select"
                  value={memberForm.userId}
                  onChange={e => setMemberForm(prev => ({ ...prev, userId: e.target.value }))}
                  disabled={!activeWorkspaceId}
                >
                  <option value="">Pilih user</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName} ({profile.email || 'tanpa email'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role Workspace</label>
                <select
                  className="form-select"
                  value={memberForm.role}
                  onChange={e => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  {WORKSPACE_ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" disabled={saving || !activeWorkspaceId || !memberForm.userId}>
                Simpan Member
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">{activeWorkspace ? `Member: ${activeWorkspace.name}` : 'Daftar Workspace'}</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-spinner" />
          ) : workspaces.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">Belum ada workspace</div>
              <div className="empty-state-desc">Buat workspace pertama untuk mulai mengelola komunitas.</div>
            </div>
          ) : membersLoading ? (
            <div className="loading-spinner" />
          ) : members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Belum ada member</div>
              <div className="empty-state-desc">Tambahkan user ke workspace ini.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Bergabung</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => {
                    const profile = profileById[member.user_id];
                    return (
                      <tr key={member.id}>
                        <td><strong>{profile?.displayName || member.user_id}</strong></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{profile?.email || '-'}</td>
                        <td><span className="badge badge-blue">{ROLE_LABELS[member.role] || member.role}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {formatDate(member.created_at)}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveMember(member)}>
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
