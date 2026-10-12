'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, randInt } from '@/lib/rng';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { useRaf } from '@/hooks/useRaf';
import { Kbd, Stat, TimeBar } from '@/components/ui';

const W = 400, H = 480, LANES = 4, R = 12;
const KEYS = ['d', 'f', 'j', 'k'];
interface Obj { id: number; lane: number; y: number }

export default function Intercept({ settings, seed, onFinish }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const duration = Number(settings.duration), vb = Number(settings.ballSpeed), vp = Number(settings.shotSpeed), spawnMs = Number(settings.spawnMs);
  const world = useRef({ balls: [] as Obj[], shots: [] as Obj[], nextSpawn: 600, id: 0, hits: 0, missedBalls: 0, wasted: 0, fired: 0 });
  const [, force] = useState(0);
  const [running, setRunning] = useState(true);

  const finish = useCallback(() => {
    if (!running) return;
    setRunning(false);
    const w = world.current;
    onFinish({ score: w.hits - w.missedBalls - w.wasted, correct: w.hits, total: w.hits + w.missedBalls, lines: [`${w.hits} hits from ${w.fired} shots`, `${w.missedBalls} balls got through`, `${w.wasted} wasted shots`] });
  }, [onFinish, running]);
  const left = useCountdown(duration, running, finish);

  useRaf((dt, elapsed) => {
    const w = world.current;
    if (elapsed > w.nextSpawn) { w.balls.push({ id: w.id++, lane: randInt(rng, 0, LANES - 1), y: -R }); w.nextSpawn = elapsed + spawnMs * (0.7 + rng() * 0.6); }
    w.balls.forEach((b) => (b.y += vb * dt));
    w.shots.forEach((s) => (s.y -= vp * dt));
    // collisions
    for (const s of w.shots) for (const b of w.balls) if (s.lane === b.lane && Math.abs(s.y - b.y) < R * 2) { s.y = -999; b.y = 9999; w.hits++; }
    w.balls = w.balls.filter((b) => { if (b.y > H && b.y < 9999) { w.missedBalls++; return false; } return b.y < H; });
    w.shots = w.shots.filter((s) => { if (s.y < -R && s.y > -999) { w.wasted++; return false; } return s.y >= -R; });
    force((x) => (x + 1) % 1e6);
  }, running);

  const fire = (lane: number) => { if (!running) return; world.current.fired++; world.current.shots.push({ id: world.current.id++, lane, y: H - 10 }); };
  useKeys(Object.fromEntries(KEYS.map((k, i) => [k, () => fire(i)])));
  const w = world.current;
  const lx = (lane: number) => (W / LANES) * (lane + 0.5);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-end justify-between gap-4"><Stat label="Hits" value={w.hits} /><Stat label="Missed" value={w.missedBalls + w.wasted} tone="ask" /></div>
      <TimeBar leftMs={left} totalMs={duration * 1000} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none rounded-lg border border-line bg-surface" data-testid="field">
        {Array.from({ length: LANES }, (_, i) => <line key={i} x1={lx(i)} x2={lx(i)} y1={0} y2={H} className="stroke-line" strokeWidth={2} />)}
        {w.balls.map((b) => <circle key={b.id} cx={lx(b.lane)} cy={b.y} r={R} className="fill-ask" />)}
        {w.shots.map((s) => <rect key={s.id} x={lx(s.lane) - 3} y={s.y - 8} width={6} height={16} rx={3} className="fill-accent" />)}
        {Array.from({ length: LANES }, (_, i) => (
          <g key={i} onPointerDown={() => fire(i)} className="cursor-pointer">
            <rect x={lx(i) - 22} y={H - 26} width={44} height={24} rx={6} className="fill-ink" />
            <text x={lx(i)} y={H - 9} textAnchor="middle" fontSize={13} className="fill-surface uppercase">{KEYS[i]}</text>
          </g>
        ))}
      </svg>
      <p className="text-center text-sm text-muted">Fire with <Kbd>D</Kbd> <Kbd>F</Kbd> <Kbd>J</Kbd> <Kbd>K</Kbd> or tap a cannon. Lead the target: shots take time to rise.</p>
    </div>
  );
}
