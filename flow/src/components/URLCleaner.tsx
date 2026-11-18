'use client';

import { useEffect } from 'react';

/**
 * Silently cleans authorization artifacts (?code=..., ?next=...) from the browser address bar.
 */
export function URLCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const url = new URL(window.location.href);
      let changed = false;

      if (url.searchParams.has('code')) {
        url.searchParams.delete('code');
        changed = true;
      }
      if (url.searchParams.has('next')) {
        url.searchParams.delete('next');
        changed = true;
      }

      if (changed) {
        const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
        window.history.replaceState({}, '', cleanPath);
      }
    }
  }, []);

  return null;
}
