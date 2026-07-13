import { useEffect, useMemo, useState } from 'react';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { listProfilesByIds } from '@/modules/shared/services/profileService';
import { listTradeReviews, saveTradeReview } from '@/modules/shared/services/tradeReviewService';
import { formatDateTime } from '@/modules/shared/utils/formatters';
import CustomSelect from '@/modules/shared/components/CustomSelect';

const EMPTY_FORM = {
  comment: '',
  disciplineScore: 3,
  psychologyScore: 3,
  riskScore: 3,
  tags: '',
};

export default function TradeReviewPanel({
  trade,
  ownerId,
  currentUser,
  canReview = false,
  showToast,
}) {
  const [reviews, setReviews] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const profileById = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }, [profiles]);

  const ownReview = useMemo(
    () => reviews.find((review) => review.mentor_id === currentUser?.id) || null,
    [reviews, currentUser?.id]
  );

  useEffect(() => {
    if (!trade?.id || !ownerId) {
      setReviews([]);
      setProfiles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReviews() {
      setLoading(true);
      try {
        const rows = await listTradeReviews(ownerId, trade.id);
        const mentorIds = rows.map((review) => review.mentor_id);
        const mentorProfiles = await listProfilesByIds(mentorIds);
        if (cancelled) return;
        setReviews(rows);
        setProfiles(mentorProfiles);
      } catch (error) {
        if (!cancelled) showToast?.(`Gagal memuat review trade: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [ownerId, showToast, trade?.id]);

  useEffect(() => {
    if (!ownReview) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      comment: ownReview.comment || '',
      disciplineScore: ownReview.discipline_score || 3,
      psychologyScore: ownReview.psychology_score || 3,
      riskScore: ownReview.risk_score || 3,
      tags: Array.isArray(ownReview.tags) ? ownReview.tags.join(', ') : '',
    });
  }, [ownReview]);

  const handleSave = async () => {
    if (!canReview || !currentUser?.id) return;

    setSaving(true);
    try {
      const saved = await saveTradeReview({
        tradeId: trade.id,
        ownerId,
        mentorId: currentUser.id,
        comment: form.comment,
        disciplineScore: Number(form.disciplineScore) || null,
        psychologyScore: Number(form.psychologyScore) || null,
        riskScore: Number(form.riskScore) || null,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });

      await createAuditLogSafe({
        actorId: currentUser.id,
        action: ownReview ? 'trade_review.updated' : 'trade_review.created',
        targetType: 'trade_review',
        targetId: saved.id,
        metadata: {
          tradeId: trade.id,
          ownerId,
        },
      });

      const nextReviews = ownReview
        ? reviews.map((review) => review.id === saved.id ? saved : review)
        : [saved, ...reviews];
      setReviews(nextReviews);
      showToast?.('Review trade berhasil disimpan.');
    } catch (error) {
      showToast?.(`Gagal menyimpan review: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Review Mentor</h3>
      </div>
      <div className="card-body">
        {canReview ? (
          <div style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label">Komentar Review</label>
              <textarea
                className="form-textarea"
                value={form.comment}
                onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                placeholder="Tulis evaluasi entry, exit, disiplin, dan perbaikan berikutnya."
              />
            </div>
            <div className="form-row">
              <ScoreField
                label="Disiplin"
                value={form.disciplineScore}
                onChange={(value) => setForm((prev) => ({ ...prev, disciplineScore: value }))}
              />
              <ScoreField
                label="Psikologi"
                value={form.psychologyScore}
                onChange={(value) => setForm((prev) => ({ ...prev, psychologyScore: value }))}
              />
              <ScoreField
                label="Risk Mgmt"
                value={form.riskScore}
                onChange={(value) => setForm((prev) => ({ ...prev, riskScore: value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tag Kesalahan / Fokus</label>
              <input
                className="form-input"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="misal: fomo, cutloss-late, risk-too-big"
              />
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : ownReview ? 'Perbarui Review' : 'Simpan Review'}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Memuat review...</div>
        ) : reviews.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>
            Belum ada review mentor untuk transaksi ini.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {reviews.map((review) => {
              const mentor = profileById[review.mentor_id];
              return (
                <div
                  key={review.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 14,
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{mentor?.displayName || mentor?.email || 'Mentor'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatDateTime(review.updated_at || review.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <ScoreBadge label="Disiplin" value={review.discipline_score} />
                      <ScoreBadge label="Psikologi" value={review.psychology_score} />
                      <ScoreBadge label="Risk" value={review.risk_score} />
                    </div>
                  </div>
                  {review.comment ? (
                    <div style={{ marginBottom: Array.isArray(review.tags) && review.tags.length > 0 ? 10 : 0, whiteSpace: 'pre-wrap' }}>
                      {review.comment}
                    </div>
                  ) : null}
                  {Array.isArray(review.tags) && review.tags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {review.tags.map((tag) => (
                        <span key={tag} className="badge badge-blue">#{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreField({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <CustomSelect className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>{score} / 5</option>
        ))}
      </CustomSelect>
    </div>
  );
}

function ScoreBadge({ label, value }) {
  return (
    <span className="badge badge-blue">
      {label}: {value || '-'}
    </span>
  );
}
