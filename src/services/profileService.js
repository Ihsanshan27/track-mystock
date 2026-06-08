import { isSupabaseConfigured, supabase } from './supabaseClient';

const DEFAULT_ROLE = 'trader';
export const USER_ROLES = ['admin', 'mentor', 'trader', 'viewer'];

export async function loadProfile(user) {
  if (!user) return null;

  if (!isSupabaseConfigured) {
    return createFallbackProfile(user);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, default_role, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return normalizeProfile(data, user);

  return ensureProfile(user);
}

export async function ensureProfile(user) {
  if (!user) return null;

  const fallback = createFallbackProfile(user);
  if (!isSupabaseConfigured) return fallback;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || null,
      display_name: user.username || user.email || 'User',
      default_role: DEFAULT_ROLE,
    }, { onConflict: 'id' })
    .select('id, email, display_name, default_role, created_at, updated_at')
    .single();

  if (error) throw error;
  return normalizeProfile(data, user);
}

export async function updateProfileName(user, displayName) {
  if (!user) throw new Error('User belum login');

  if (!isSupabaseConfigured) {
    return {
      ...createFallbackProfile(user),
      displayName,
      username: displayName,
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)
    .select('id, email, display_name, default_role, created_at, updated_at')
    .single();

  if (error) throw error;
  return normalizeProfile(data, user);
}

export async function listProfiles() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, default_role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(profile => normalizeProfile(profile, {}));
}

export async function listProfilesByIds(profileIds) {
  if (!isSupabaseConfigured || !profileIds?.length) return [];

  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, default_role, created_at, updated_at')
    .in('id', uniqueIds);

  if (error) throw error;
  return (data || []).map(profile => normalizeProfile(profile, {}));
}

export async function updateProfileRole(profileId, role) {
  if (!USER_ROLES.includes(role)) throw new Error('Role tidak valid');
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');

  const { data, error } = await supabase
    .from('profiles')
    .update({ default_role: role })
    .eq('id', profileId)
    .select('id, email, display_name, default_role, created_at, updated_at')
    .single();

  if (error) throw error;
  return normalizeProfile(data, {});
}

function createFallbackProfile(user) {
  return {
    id: user.id,
    email: user.email || null,
    displayName: user.username || user.email || 'User',
    username: user.username || user.email || 'User',
    role: user.role || DEFAULT_ROLE,
    provider: user.provider || 'localStorage',
  };
}

function normalizeProfile(profile, user) {
  return {
    id: profile.id,
    email: profile.email || user.email || null,
    displayName: profile.display_name || user.username || user.email || 'User',
    username: profile.display_name || user.username || user.email || 'User',
    role: profile.default_role || DEFAULT_ROLE,
    provider: user.provider || 'supabase',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
