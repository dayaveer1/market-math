'use client';
import { useEffect, useRef } from 'react';

/** Bind keys while mounted. Keys are matched case-insensitively against KeyboardEvent.key (use ' ' for Space). Ignored when typing in inputs unless allowInInputs. */
export function useKeys(map: Record<string, (e: KeyboardEvent) => void>, opts: { enabled?: boolean; allowInInputs?: boolean } = {}) {
  const ref = useRef(map);
  ref.current = map;
  const { enabled = true, allowInInputs = false } = opts;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing && !allowInInputs && e.key !== 'Escape') return;
      const fn = ref.current[e.key.toLowerCase()] ?? ref.current[e.key];
      if (fn) { fn(e); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [enabled, allowInInputs]);
}
