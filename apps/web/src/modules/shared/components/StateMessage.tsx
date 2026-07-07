export default function StateMessage({
  title,
  description,
  tone = 'neutral',
  actionLabel = undefined,
  onAction = undefined,
  children = undefined,
}) {
  const toneColor = tone === 'danger'
    ? 'var(--accent-red)'
    : tone === 'warning'
      ? 'var(--accent-yellow)'
      : 'var(--accent-blue-light)';

  return (
    <div className="card" style={{ maxWidth: 760, margin: '40px auto', borderColor: toneColor }}>
      <div className="card-body">
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{description}</p>
          </div>
          {actionLabel && (
            <button className="btn btn-secondary" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
        {children && (
          <div style={{ marginTop: 20 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
