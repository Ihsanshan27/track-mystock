import { isSupabaseConfigured, supabase } from './supabaseClient';

export const WORKSPACE_ROLES = ['admin', 'mentor', 'trader', 'viewer'];

export async function listWorkspaces() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, owner_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createWorkspace({ name, ownerId }) {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, owner_id: ownerId })
    .select('id, name, owner_id, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function listWorkspaceMembers(workspaceId) {
  if (!isSupabaseConfigured || !workspaceId) return [];

  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertWorkspaceMember({ workspaceId, userId, role }) {
  if (!WORKSPACE_ROLES.includes(role)) throw new Error('Role workspace tidak valid');
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');

  const { data, error } = await supabase
    .from('workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    }, { onConflict: 'workspace_id,user_id' })
    .select('id, workspace_id, user_id, role, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function removeWorkspaceMember(memberId) {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}
