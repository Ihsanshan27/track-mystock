import { isSupabaseConfigured, supabase } from './supabaseClient';

export async function createAuditLog({ actorId, action, targetType, targetId, metadata = {} }) {
  if (!isSupabaseConfigured || !actorId) return;

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    });

  if (error) throw error;
}

export async function listAuditLogs(limit = 100) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
