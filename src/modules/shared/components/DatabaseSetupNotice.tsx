import StateMessage from '@/modules/shared/components/StateMessage';

export default function DatabaseSetupNotice({ error, onRetry }) {
  return (
    <StateMessage
      tone="warning"
      title="Database belum siap"
      description="Aplikasi berhasil login, tapi tabel Supabase yang dibutuhkan belum tersedia atau migration belum dijalankan."
      actionLabel="Coba Lagi"
      onAction={onRetry}
    >
      <div style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 10 }}>
          Jalankan dari terminal:
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
{`npm run db:link
npm run db:push`}
        </pre>
        {error && (
          <div style={{ color: 'var(--accent-yellow)', fontSize: '0.78rem', marginTop: 12 }}>
            Detail: {error}
          </div>
        )}
      </div>
    </StateMessage>
  );
}
