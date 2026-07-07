import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

const TABLE_NAME = 'trade_reviews';

export async function listTradeReviews(ownerId, tradeId) {
  if (isApiConfigured) {
    if (!tradeId) return [];
    const rows = await apiRequest(`/trade-reviews?tradeId=${encodeURIComponent(tradeId)}`);
    return (rows || []).map(normalizeTradeReviewRow);
  }

  void ownerId;
  void tradeId;
  return [];
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
  if (isApiConfigured) {
    const existingRows = await listTradeReviews(ownerId, tradeId);
    const existingReview = existingRows.find((row) => row.mentor_id === mentorId) || null;
    const payload = {
      tradeId,
      mentorUserId: mentorId,
      comment: comment || null,
      disciplineScore: disciplineScore || null,
      psychologyScore: psychologyScore || null,
      riskScore: riskScore || null,
      tags: normalizeTags(tags),
    };

    const data = existingReview
      ? await apiRequest(`/trade-reviews/${existingReview.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      : await apiRequest('/trade-reviews', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    return normalizeTradeReviewRow(data);
  }

  void ownerId;
  void tradeId;
  void mentorId;
  void comment;
  void disciplineScore;
  void psychologyScore;
  void riskScore;
  void tags;
  throw new Error('API backend belum dikonfigurasi.');
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag).trim()).filter(Boolean);
}

function normalizeTradeReviewRow(row) {
  return {
    id: row.id,
    trade_id: row.tradeId,
    owner_id: row.ownerUserId,
    mentor_id: row.mentorUserId,
    mentor_name: row.mentorName || null,
    comment: row.comment || null,
    discipline_score: row.disciplineScore,
    psychology_score: row.psychologyScore,
    risk_score: row.riskScore,
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
