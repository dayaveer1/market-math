'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, pick } from '@/lib/rng';
import { explosionPoint, optimalPumps } from '@/lib/engines/cognitive';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat } from '@/components/ui';
import { fmtMoney } from '@/lib/parse';

const KINDS = { blue: 128, amber: 32, red: 8 } as const;
type Kind = keyof typeof KINDS | 'single';

export default function Pump({ settings, seed, onFinish }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const n = Number(settings.balloons), mixed = settings.type === 'mixed', single = Number(settings.maxPumps), cents = Number(settings.cents);
  const newBalloon = () => { const kind: Kind = mixed ? pick(rng, ['blue', 'amber', 'red'] as const) : 'single'; const max = kind === 'single' ? single : KINDS[kind]; return { kind, max, pop: explosionPoint(rng, max) }; };
  const [i, setI] = useState(0);
  const [b, setB] = useState(newBalloon);
  const [pumps, setPumps] = useState(0);
  const [bank, setBank] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const [busy, setBusy] = useState(false);
  const log = useRef<{ kind: Kind; pumps: number; popped: boolean }[]>([]);

  const nextBalloon = (popped: boolean, p: number) => {
    log.current.push({ kind: b.kind, pumps: p, popped });
    if (i + 1 >= n) {
      const L = log.current;
      const unpopped = L.filter((x) => !x.popped);
      const adj = unpopped.length ? unpopped.reduce((a, x) => a + x.pumps, 0) / unpopped.length : 0;
      const afterLoss = L.slice(1).filter((_, k) => L[k].popped), afterWin = L.slice(1).filter((_, k) => !L[k].popped);
      const avg = (a: typeof L) => (a.length ? a.reduce((u, x) => u + x.pumps, 0) / a.length : 0);
      const finalBank = bank + (popped ? 0 : p * cents / 100);
      onFinish({ score: Math.round(finalBank * 100) / 100, correct: unpopped.length, total: n, lines: [
        `Average pumps on balloons you cashed: ${adj.toFixed(1)} (risk appetite)`,
        `After a pop you pumped ${avg(afterLoss).toFixed(1)} on average; after a cash-in ${avg(afterWin).toFixed(1)}`,
        mixed ? `Expected-value-maximising targets: blue ${optimalPumps(128)}, amber ${optimalPumps(32)}, red ${optimalPumps(8)}` : `Expected-value-maximising target: ${optimalPumps(single)} pumps`,
      ] });
      return;
    }
    setI(i + 1); setB(newBalloon()); setPumps(0); setBusy(false);
  };
  const pump = () => {
    if (busy) return;
    const p = pumps + 1;
    if (p >= b.pop) { setBusy(true); setPumps(p); setFb({ ok: false, text: `Popped at ${p}. Lost ${fmtMoney((p - 1) * cents / 100)}.` }); window.setTimeout(() => nextBalloon(true, p), 700); return; }
    setPumps(p);
  };
  const cash = () => {
    if (busy) return;
    const v = pumps * cents / 100;
    setBank((x) => x + v);
    setFb({ ok: true, text: `Banked ${fmtMoney(v)}.` });
    nextBalloon(false, pumps);
  };
  useKeys({ ' ': (e) => { e.preventDefault(); pump(); }, enter: cash });
  const color = b.kind === 'red' ? 'fill-ask' : b.kind === 'amber' ? 'fill-amber-500' : 'fill-accent';
  const r = 30 + Math.min(110, pumps * (110 / Math.max(16, b.max * 0.6)));

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="flex justify-between"><Stat label="Balloon" value={`${i + 1} / ${n}`} /><Stat label="This balloon" value={fmtMoney(pumps * cents / 100)} /><Stat label="Banked" value={fmtMoney(bank)} tone="bid" /></div>
      <svg viewBox="-150 -150 300 300" className="mx-auto h-72 w-72" aria-label={`${b.kind} balloon, ${pumps} pumps`}>
        {busy ? <text textAnchor="middle" y={10} fontSize={40} className="fill-ask">POP</text> : <><circle r={r} className={color} opacity={0.85} /><line x1={0} y1={r} x2={0} y2={150} className="stroke-muted" /></>}
      </svg>
      <div className="flex justify-center gap-3">
        <Button onClick={pump} disabled={busy}>Pump <Kbd>Space</Kbd></Button>
        <Button variant="bid" onClick={cash} disabled={busy}>Cash in <Kbd>Enter</Kbd></Button>
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
