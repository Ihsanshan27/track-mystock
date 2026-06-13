import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_KEY_PREFIX = 'page_scroll:';

export function useScrollRestoration() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  useLayoutEffect(() => {
    const savedY = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${routeKey}`);
    if (!savedY) return;

    window.requestAnimationFrame(() => {
      window.scrollTo(0, Number(savedY) || 0);
    });
  }, [routeKey]);

  useEffect(() => {
    const storageKey = `${SCROLL_KEY_PREFIX}${routeKey}`;

    const saveScroll = () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) saveScroll();
    };

    window.addEventListener('scroll', saveScroll, { passive: true });
    window.addEventListener('pagehide', saveScroll);
    window.addEventListener('beforeunload', saveScroll);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      saveScroll();
      window.removeEventListener('scroll', saveScroll);
      window.removeEventListener('pagehide', saveScroll);
      window.removeEventListener('beforeunload', saveScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [routeKey]);
}
