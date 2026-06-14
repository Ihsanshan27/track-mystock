import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<K extends string> {
  key: K;
  direction: SortDirection;
}

interface UseTableSortOptions<T, K extends string> {
  initialKey: K;
  initialDirection?: SortDirection;
  getValue: (item: T, key: K) => unknown;
  tieBreaker?: (a: T, b: T) => number;
}

function normalizeSortValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value.toLowerCase();
  return value;
}

function compareValues(a: unknown, b: unknown) {
  const left = normalizeSortValue(a);
  const right = normalizeSortValue(b);

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), 'id', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function useTableSort<T, K extends string>(
  items: T[],
  { initialKey, initialDirection = 'asc', getValue, tieBreaker }: UseTableSortOptions<T, K>
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<K>>({
    key: initialKey,
    direction: initialDirection,
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = compareValues(getValue(a, sortConfig.key), getValue(b, sortConfig.key));

      if (comparison === 0 && tieBreaker) {
        comparison = tieBreaker(a, b);
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [getValue, items, sortConfig, tieBreaker]);

  const requestSort = (key: K) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { sortConfig, sortedItems, requestSort };
}
