import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

export const WORKSPACE_ROLES = ['admin', 'mentor', 'trader', 'viewer'];

export async function listWorkspaces() {
  if (!isApiConfigured) return [];
  return apiRequest('/workspaces');
}

export async function createWorkspace({ name, ownerId }) {
  void ownerId;
  if (!isApiConfigured) throw new Error('API backend belum dikonfigurasi.');
  return apiRequest('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function listWorkspaceMembers(workspaceId) {
  if (!isApiConfigured) return [];
  return apiRequest(`/workspaces/${workspaceId}/members`);
}

export async function upsertWorkspaceMember({ workspaceId, userId, role }) {
  if (!WORKSPACE_ROLES.includes(role)) throw new Error('Role workspace tidak valid');
  if (!isApiConfigured) throw new Error('API backend belum dikonfigurasi.');
  return apiRequest(`/workspaces/${workspaceId}/members`, {
    method: 'PUT',
    body: JSON.stringify({ userId, role }),
  });
}

export async function removeWorkspaceMember(memberId) {
  if (!isApiConfigured) throw new Error('API backend belum dikonfigurasi.');
  return apiRequest(`/workspaces/members/${memberId}`, {
    method: 'DELETE',
  });
}
