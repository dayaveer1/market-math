'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, randInt } from '@/lib/rng';
import { inArc } from '@/lib/engines/cognitive';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { useRaf } from '@/hooks/useRaf';
import { Stat, TimeBar } from '@/components/ui';

interface Dial { id: number; slot: number; angle: number; dir: 1 | -1; arcStart: number; born: number }
const SLOTS = 6;

function arcPath(start: number, width: number, r: number) {
  const p = (a: number) => [Math.sin((a * Math.PI) / 180) * r, -Math.cos((a * Math.PI) / 180) * r];
  const [x1, y1] = p(start), [x2, y2] = p(start + width);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${width > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export default function SweetSpot({ settings, seed, onFinish }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const duration = Number(settings.duration), maxDials = Number(settings.maxDials), speed = Number(settings.speed), arc = Number(settings.arc), life = Number(settings.lifeMs);
  const w = useRef({ dials: [] as Dial[], id: 0, hits: 0, misses: 0, expired: 0, nextSpawn: 0, now: 0 });
  const [, force] = useState(0);
  const [running, setRunning] = useState(true);
  const finish = useCallback(() => {
    if (!running) return;
    setRunning(false);
    const x = w.current;
    onFinish({ score: x.hits - x.misses - x.expired, correct: x.hits, total: x.hits + x.misses + x.expired, lines: [`${x.hits} in the arc, ${x.misses} outside, ${x.expired} expired`] });
  }, [onFinish, running]);
  const left = useCountdown(duration, running, finish);

  useRaf((dt, el) => {
    const x = w.current;
    x.now = el;
    x.dials.forEach((d) => (d.angle = (d.angle + d.dir * speed * dt + 360) % 360));
    const alive = x.dials.filter((d) => el - d.born < life);
    x.expired += x.dials.length - alive.length;
    x.dials = alive;
    if (x.dials.length < maxDials && el > x.nextSpawn) {
      const free = Array.from({ length: SLOTS }, (_, k) => k).filter((k) => !x.dials.some((d) => d.slot === k));
      if (free.length) x.dials.push({ id: x.id++, slot: free[randInt(rng, 0, free.length - 1)], angle: randInt(rng, 0, 359), dir: rng() < 0.5 ? 1 : -1, arcStart: randInt(rng, 0, 359), born: el });
      x.nextSpawn = el + 400 + rng() * 900;
    }
    force((v) => (v + 1) % 1e6);
  }, running);

  const click = (slot: number) => {
    const x = w.current;
    const d = x.dials.find((q) => q.slot === slot);
    if (!d) return;
    if (inArc(d.angle, d.arcStart, arc)) x.hits++; else x.misses++;
    x.dials = x.dials.filter((q) => q !== d);
  };
  useKeys(Object.fromEntries(Array.from({ length: SLOTS }, (_, k) => [String(k + 1), () => click(k)])));
  const x = w.current;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex justify-between"><Stat label="Hits" value={x.hits} tone="bid" /><Stat label="Misses" value={x.misses + x.expired} tone="ask" /></div>
      <TimeBar leftMs={left} totalMs={duration * 1000} />
      <div className="grid grid-cols-3 gap-4" data-testid="dials">
        {Array.from({ length: SLOTS }, (_, k) => {
          const d = x.dials.find((q) => q.slot === k);
          return (
            <button key={k} onPointerDown={() => click(k)} className="relative aspect-square rounded-full border border-line bg-surface" aria-label={`Dial ${k + 1}`}>
              {d && (
                <svg viewBox="-60 -60 120 120" className="absolute inset-0 h-full w-full">
                  <circle r={50} className="fill-none stroke-line" strokeWidth={6} />
                  <path d={arcPath(d.arcStart, arc, 50)} className="fill-none stroke-bid" strokeWidth={8} strokeLinecap="round" />
                  <line x1={0} y1={0} x2={Math.sin((d.angle * Math.PI) / 180) * 46} y2={-Math.cos((d.angle * Math.PI) / 180) * 46} className="stroke-ink" strokeWidth={3} strokeLinecap="round" />
                  <circle r={4} className="fill-ink" />
                  <circle r={56} className="fill-none stroke-accent" strokeWidth={2} strokeDasharray={`${352 * Math.max(0, 1 - (x.now - d.born) / life)} 352`} transform="rotate(-90)" opacity={0.5} />
                </svg>
              )}
              <span className="absolute bottom-1 right-2 text-xs text-muted">{k + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
