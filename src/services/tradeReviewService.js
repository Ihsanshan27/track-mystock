import { isSupabaseConfigured, supabase } from './supabaseClient';

const TABLE_NAME = 'trade_reviews';

export async function listTradeReviews(ownerId, tradeId) {
  if (!isSupabaseConfigured) return [];
  if (!ownerId || !tradeId) return [];

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, trade_id, owner_id, mentor_id, comment, discipline_score, psychology_score, risk_score, tags, created_at, updated_at')
    .eq('owner_id', ownerId)
    .eq('trade_id', tradeId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveTradeReview({
  tradeId,
  ownerId,
  mentorId,
  comment,
  disciplineScore,
  psychologyScore,
  riskScore,
  tags = [],
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');

  const payload = {
    trade_id: tradeId,
    owner_id: ownerId,
    mentor_id: mentorId,
    comment: comment || null,
    discipline_score: disciplineScore || null,
    psychology_score: psychologyScore || null,
    risk_score: riskScore || null,
    tags: normalizeTags(tags),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'owner_id,mentor_id,trade_id' })
    .select('id, trade_id, owner_id, mentor_id, comment, discipline_score, psychology_score, risk_score, tags, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag).trim()).filter(Boolean);
}
