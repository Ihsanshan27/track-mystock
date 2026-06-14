import * as Icons from 'lucide-react';
import type { CSSProperties } from 'react';
import type { SortConfig } from '@/modules/shared/hooks/useTableSort';

interface SortableTableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sortConfig: SortConfig<K>;
  onSort: (key: K) => void;
  style?: CSSProperties;
  title?: string;
}

export default function SortableTableHeader<K extends string>({
  label,
  sortKey,
  sortConfig,
  onSort,
  style,
  title,
}: SortableTableHeaderProps<K>) {
  const isActive = sortConfig.key === sortKey;
  const SortIcon = isActive
    ? (sortConfig.direction === 'asc' ? Icons.ChevronUp : Icons.ChevronDown)
    : Icons.ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        font: 'inherit',
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'left',
        ...style,
      }}
      title={title || `Urutkan berdasarkan ${label}`}
    >
      <span>{label}</span>
      <SortIcon size={12} />
    </button>
  );
}
