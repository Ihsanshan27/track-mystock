import { isSupabaseConfigured, supabase } from './supabaseClient';

const TABLE_NAME = 'report_shares';

export async function listReportShares(ownerId) {
  if (!isSupabaseConfigured) return [];
  if (!ownerId) throw new Error('User belum login.');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, title, market, is_active, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createReportShare(payload) {
  if (!isSupabaseConfigured) {
    throw new Error('Share report butuh Supabase aktif.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select('id, title, market, is_active, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateReportShare(shareId, payload) {
  if (!isSupabaseConfigured) {
    throw new Error('Share report butuh Supabase aktif.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq('id', shareId)
    .select('id, title, market, is_active, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReportShare(shareId) {
  if (!isSupabaseConfigured) {
    throw new Error('Share report butuh Supabase aktif.');
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', shareId);

  if (error) throw error;
}

export async function loadPublicReportShare(shareId) {
  if (!isSupabaseConfigured) {
    throw new Error('Share report butuh Supabase aktif.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, title, market, report_data, is_active, created_at, updated_at')
    .eq('id', shareId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Report share tidak ditemukan atau sudah dinonaktifkan.');
  return data;
}
