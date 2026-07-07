export default function ReadOnlyNotice({ title = 'Mode Read-Only', description = 'Akun Anda hanya punya akses baca untuk area ini.' }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        borderColor: 'var(--accent-blue)',
        background: 'var(--accent-blue-dim)',
      }}
    >
      <div className="card-body" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent-blue-light)' }}>{title}</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{description}</div>
      </div>
    </div>
  );
}
