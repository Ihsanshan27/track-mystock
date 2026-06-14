import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
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
  const { confirm } = useDialog();
  const { refreshWorkspaces, selectWorkspace } = useWorkspace();
  const [workspaceList, setWorkspaceList] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [memberInviteForm, setMemberInviteForm] = useState({ userId: '', role: 'trader' });
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isMemberListLoading, setIsMemberListLoading] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState('');

  const activeWorkspace = useMemo(
    () => workspaceList.find(workspace => workspace.id === activeWorkspaceId),
    [workspaceList, activeWorkspaceId]
  );

  const profileById = useMemo(() => {
    return userProfiles.reduce((profilesByIdMap, profile) => {
      profilesByIdMap[profile.id] = profile;
      return profilesByIdMap;
    }, {});
  }, [userProfiles]);

  const inviteableProfiles = useMemo(() => {
    const currentWorkspaceMemberIds = new Set(workspaceMembers.map(member => member.user_id));
    return userProfiles.filter(profile => !currentWorkspaceMemberIds.has(profile.id));
  }, [workspaceMembers, userProfiles]);
  const { sortConfig, sortedItems: sortedWorkspaceMembers, requestSort } = useTableSort(workspaceMembers, {
    initialKey: 'displayName',
    getValue: (member: any, key: 'displayName' | 'email' | 'role' | 'created_at') => {
      const profile = profileById[member.user_id];
      if (key === 'displayName') return profile?.displayName || member.user_id;
      if (key === 'email') return profile?.email || '';
      return member[key] || '';
    },
  });

  const loadWorkspaceMembers = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setWorkspaceMembers([]);
      return;
    }

    setIsMemberListLoading(true);
    try {
      const workspaceMemberRows = await listWorkspaceMembers(workspaceId);
      setWorkspaceMembers(workspaceMemberRows);
    } catch (error) {
      showToast(`Gagal memuat member: ${error.message}`, 'error');
    } finally {
      setIsMemberListLoading(false);
    }
  }, [showToast]);

  const loadInitialData = useCallback(async () => {
    setIsPageLoading(true);
    setPageErrorMessage('');
    try {
      const [workspaceRows, profileRows] = await Promise.all([
        listWorkspaces(),
        listProfiles(),
      ]);
      setWorkspaceList(workspaceRows);
      setUserProfiles(profileRows);
      const firstWorkspaceId = workspaceRows[0]?.id || '';
      setActiveWorkspaceId(firstWorkspaceId);
      if (firstWorkspaceId) await loadWorkspaceMembers(firstWorkspaceId);
    } catch (error) {
      setPageErrorMessage(error.message);
      showToast(`Gagal memuat workspace: ${error.message}`, 'error');
    } finally {
      setIsPageLoading(false);
    }
  }, [loadWorkspaceMembers, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleWorkspaceChange = async (workspaceId) => {
    setActiveWorkspaceId(workspaceId);
    setMemberInviteForm(previousForm => ({ ...previousForm, userId: '' }));
    await loadWorkspaceMembers(workspaceId);
  };

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    if (!user?.id) {
      showToast('User belum login', 'error');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const newWorkspace = await createWorkspace({ name: workspaceName.trim(), ownerId: user.id });
      await upsertWorkspaceMember({ workspaceId: newWorkspace.id, userId: user.id, role: 'admin' });
      await createAuditLog({
        actorId: user.id,
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: newWorkspace.id,
        metadata: { name: newWorkspace.name },
      });
      setWorkspaceName('');
      setWorkspaceList(previousWorkspaceList => [newWorkspace, ...previousWorkspaceList]);
      setActiveWorkspaceId(newWorkspace.id);
      selectWorkspace(newWorkspace.id);
      await refreshWorkspaces();
      await loadWorkspaceMembers(newWorkspace.id);
      showToast('Workspace berhasil dibuat');
    } catch (error) {
      showToast(`Gagal buat workspace: ${error.message}`, 'error');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!activeWorkspaceId || !memberInviteForm.userId) return;

    setIsSavingMember(true);
    try {
      await upsertWorkspaceMember({
        workspaceId: activeWorkspaceId,
        userId: memberInviteForm.userId,
        role: memberInviteForm.role,
      });
      await createAuditLog({
        actorId: user?.id,
        action: 'workspace.member_upserted',
        targetType: 'workspace',
        targetId: activeWorkspaceId,
        metadata: {
          userId: memberInviteForm.userId,
          role: memberInviteForm.role,
        },
      });
      setMemberInviteForm({ userId: '', role: 'trader' });
      await loadWorkspaceMembers(activeWorkspaceId);
      showToast('Member workspace diperbarui');
    } catch (error) {
      showToast(`Gagal invite member: ${error.message}`, 'error');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleRemoveMember = async (workspaceMember) => {
    if (workspaceMember.user_id === user?.id) {
      showToast('Admin yang sedang login tidak bisa menghapus dirinya sendiri dari workspace ini.', 'error');
      return;
    }

    const memberProfile = profileById[workspaceMember.user_id];
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus ${memberProfile?.displayName || 'member'} dari workspace?`, {
      title: 'Hapus Member Workspace',
      severity: 'warning',
      confirmText: 'Hapus Member'
    });
    if (!isConfirmed) return;

    try {
      await removeWorkspaceMember(workspaceMember.id);
      await createAuditLog({
        actorId: user?.id,
        action: 'workspace.member_removed',
        targetType: 'workspace',
        targetId: workspaceMember.workspace_id,
        metadata: {
          userId: workspaceMember.user_id,
          role: workspaceMember.role,
        },
      });
      await loadWorkspaceMembers(activeWorkspaceId);
      showToast('Member dihapus dari workspace');
    } catch (error) {
      showToast(`Gagal hapus member: ${error.message}`, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Management</h1>
          <p className="page-subtitle">Buat workspace dan kelola member komunitas</p>
        </div>
        <button className="btn btn-secondary" onClick={loadInitialData} disabled={isPageLoading}>Refresh</button>
      </div>

      {pageErrorMessage && (
        <div className="card admin-workspaces-error-card">
          <div className="card-body admin-workspaces-error-body">
            {pageErrorMessage}
          </div>
        </div>
      )}

      <div className="grid-2 admin-workspaces-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Buat Workspace</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreateWorkspace}>
              <div className="form-group">
                <label className="form-label">Nama Workspace</label>
                <input
                  className="form-input"
                  value={workspaceName}
                  onChange={event => setWorkspaceName(event.target.value)}
                  placeholder="Contoh: Komunitas Swing Trader"
                />
              </div>
              <button className="btn btn-primary" disabled={isCreatingWorkspace || !workspaceName.trim()}>
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
                <label className="form-label" htmlFor="workspace-select">Workspace</label>
                <select
                  id="workspace-select"
                  className="form-select"
                  aria-label="Pilih workspace"
                  value={activeWorkspaceId}
                  onChange={event => handleWorkspaceChange(event.target.value)}
                >
                  <option value="">Pilih workspace</option>
                  {workspaceList.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="workspace-user-select">User</label>
                <select
                  id="workspace-user-select"
                  className="form-select"
                  aria-label="Pilih user untuk workspace"
                  value={memberInviteForm.userId}
                  onChange={event => setMemberInviteForm(previousForm => ({ ...previousForm, userId: event.target.value }))}
                  disabled={!activeWorkspaceId}
                >
                  <option value="">
                    {inviteableProfiles.length === 0 ? 'Semua user sudah menjadi member' : 'Pilih user'}
                  </option>
                  {inviteableProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName} ({profile.email || 'tanpa email'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="workspace-role-select">Role Workspace</label>
                <select
                  id="workspace-role-select"
                  className="form-select"
                  aria-label="Pilih role workspace"
                  value={memberInviteForm.role}
                  onChange={event => setMemberInviteForm(previousForm => ({ ...previousForm, role: event.target.value }))}
                >
                  {WORKSPACE_ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                disabled={isSavingMember || !activeWorkspaceId || !memberInviteForm.userId}
              >
                Simpan Member
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card admin-workspaces-members-card">
        <div className="card-header">
          <h3 className="card-title">{activeWorkspace ? `Member: ${activeWorkspace.name}` : 'Daftar Workspace'}</h3>
        </div>
        <div className="card-body">
          {isPageLoading ? (
            <div className="loading-spinner" />
          ) : workspaceList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">ðŸ¢</div>
              <div className="empty-state-title">Belum ada workspace</div>
              <div className="empty-state-desc">Buat workspace pertama untuk mulai mengelola komunitas.</div>
            </div>
          ) : isMemberListLoading ? (
            <div className="loading-spinner" />
          ) : workspaceMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">ðŸ‘¥</div>
              <div className="empty-state-title">Belum ada member</div>
              <div className="empty-state-desc">Tambahkan user ke workspace ini.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th><SortableTableHeader label="User" sortKey="displayName" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Role" sortKey="role" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Bergabung" sortKey="created_at" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWorkspaceMembers.map(workspaceMember => {
                    const profile = profileById[workspaceMember.user_id];
                    return (
                      <tr key={workspaceMember.id}>
                        <td><strong>{profile?.displayName || workspaceMember.user_id}</strong></td>
                        <td className="admin-workspaces-secondary-text">{profile?.email || '-'}</td>
                        <td><span className="badge badge-blue">{ROLE_LABELS[workspaceMember.role] || workspaceMember.role}</span></td>
                        <td className="admin-workspaces-joined-text">
                          {formatDate(workspaceMember.created_at)}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveMember(workspaceMember)}>
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
