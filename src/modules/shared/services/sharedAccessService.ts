import { isSupabaseConfigured, supabase } from '@/modules/shared/services/supabaseClient';

const TABLE_NAME = 'shared_access';
export const ACCESS_LEVELS = ['read', 'review', 'admin'];

export async function listOwnedSharedAccess(ownerId) {
  if (!isSupabaseConfigured) return [];
  if (!ownerId) throw new Error('User belum login.');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, owner_id, grantee_id, access_level, expires_at, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listGrantedSharedAccess(granteeId) {
  if (!isSupabaseConfigured) return [];
  if (!granteeId) throw new Error('User belum login.');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, owner_id, grantee_id, access_level, expires_at, created_at')
    .eq('grantee_id', granteeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertSharedAccess({ ownerId, granteeId, accessLevel, expiresAt = null }) {
  if (!ACCESS_LEVELS.includes(accessLevel)) throw new Error('Level akses tidak valid.');
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert({
      owner_id: ownerId,
      grantee_id: granteeId,
      access_level: accessLevel,
      expires_at: expiresAt || null,
    }, { onConflict: 'owner_id,grantee_id' })
    .select('id, owner_id, grantee_id, access_level, expires_at, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function revokeSharedAccess(shareId) {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', shareId);

  if (error) throw error;
}
