'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Countdown in milliseconds. Changing `resetKey` restarts it. seconds <= 0 disables it (returns null).
 * Pausing (running=false) freezes the remaining time. onExpire fires once per run.
 */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void, resetKey: unknown = 0): number | null {
  const [left, setLeft] = useState(seconds * 1000);
  const remRef = useRef(seconds * 1000);
  const firedRef = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;
  useEffect(() => {
    remRef.current = seconds * 1000;
    firedRef.current = false;
    setLeft(seconds * 1000);
  }, [seconds, resetKey]);
  useEffect(() => {
    if (seconds <= 0 || !running) return;
    const start = performance.now();
    const startRem = remRef.current;
    const id = window.setInterval(() => {
      const l = Math.max(0, startRem - (performance.now() - start));
      remRef.current = l;
      setLeft(l);
      if (l <= 0 && !firedRef.current) { firedRef.current = true; cb.current(); }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, seconds, resetKey]);
  return seconds > 0 ? left : null;
}
