import { useData } from '@/modules/shared/context/DataContext';

/**
 * Returns CSS style object for blurring sensitive financial figures
 * when privacy mode is active.
 *
 * Usage:
 *   const blurStyle = usePrivacyStyle();
 *   <span style={blurStyle}>{formatMoney(amount)}</span>
 */
export function usePrivacyStyle(): React.CSSProperties {
  const { settings } = useData();
  return settings.privacyMode
    ? { filter: 'blur(6px)', transition: 'filter 0.2s ease-in-out' }
    : {};
}
