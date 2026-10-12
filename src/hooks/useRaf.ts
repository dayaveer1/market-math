'use client';
import { useEffect, useRef } from 'react';

/** requestAnimationFrame loop; callback receives dt in seconds and elapsed ms since start. */
export function useRaf(cb: (dt: number, elapsedMs: number) => void, running: boolean) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!running) return;
    let id = 0, last = performance.now();
    const start = last;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ref.current(dt, t - start);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}
