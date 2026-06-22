import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectionToggleCardProps {
  checked: boolean;
  onToggle: () => void;
  title: ReactNode;
  description?: ReactNode;
  rightContent?: ReactNode;
  compact?: boolean;
}

export default function SelectionToggleCard({
  checked,
  onToggle,
  title,
  description,
  rightContent,
  compact = false,
}: SelectionToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        padding: compact ? '10px 12px' : '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: checked ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)',
        background: checked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
        boxShadow: checked ? '0 0 0 1px rgba(16, 185, 129, 0.12)' : 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: compact ? 20 : 22,
            height: compact ? 20 : 22,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: checked ? 'var(--accent-green)' : 'transparent',
            color: checked ? '#ffffff' : 'var(--text-muted)',
            border: checked ? 'none' : '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          <Check size={compact ? 12 : 14} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: compact ? '0.82rem' : '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </span>
          {description ? (
            <span style={{ display: 'block', fontSize: compact ? '0.72rem' : '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {description}
            </span>
          ) : null}
        </span>
      </span>
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {rightContent || (
          <span
            className={checked ? 'badge badge-green' : 'badge'}
            style={checked ? undefined : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            {checked ? 'Aktif' : 'Nonaktif'}
          </span>
        )}
      </span>
    </button>
  );
}
