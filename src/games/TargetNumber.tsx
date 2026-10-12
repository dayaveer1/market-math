'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { checkSolution, generatePuzzle, solve } from '@/lib/engines/targetNumber';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, TimeBar } from '@/components/ui';

export default function TargetNumber({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const rounds = Number(settings.rounds), rt = Number(settings.roundTime), maxNum = Number(settings.maxNum), tMax = Number(settings.targetMax);
  const gen = () => generatePuzzle(rng, maxNum, 10, tMax);
  const [i, setI] = useState(0);
  const [p, setP] = useState(gen);
  const [expr, setExpr] = useState('');
  const [over, setOver] = useState(false);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ solved: 0, ms: [] as number[] });
  const t0 = useRef(performance.now());

  const end = (ok: boolean, why: string) => {
    setOver(true);
    if (ok) { s.current.solved++; s.current.ms.push(performance.now() - t0.current); }
    else onMistake({ prompt: `Make ${p.target} from ${p.nums.join(', ')}`, given: expr || '(none)', expected: solve(p.nums, p.target) ?? '?' });
    setFb({ ok, text: ok ? 'Solved' : `${why} One solution: ${solve(p.nums, p.target)}` });
  };
  const submit = () => {
    if (over) { next(); return; }
    const r = checkSolution(expr, p.nums, p.target);
    if (r.ok) end(true, ''); else setFb({ ok: false, text: r.reason ?? 'Not quite.' });
  };
  const next = () => {
    if (i + 1 >= rounds) { onFinish({ score: s.current.solved, correct: s.current.solved, total: rounds, avgMs: s.current.ms.length ? s.current.ms.reduce((a, b) => a + b, 0) / s.current.ms.length : undefined }); return; }
    setI(i + 1); setP(gen()); setExpr(''); setOver(false); setFb({ ok: null, text: '' }); t0.current = performance.now();
  };
  const left = useCountdown(rt, !over, () => end(false, 'Time.'), i);
  useKeys({ enter: () => over && next() });

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="num text-sm text-muted">Round {i + 1} / {rounds}</div>
      <TimeBar leftMs={left} totalMs={rt * 1000} />
      <div className="num text-6xl font-semibold" data-testid="target">{p.target}</div>
      <div className="flex justify-center gap-3">{p.nums.map((n, k) => <div key={k} className="num flex h-14 w-14 items-center justify-center rounded-md border border-line bg-surface text-2xl">{n}</div>)}</div>
      <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <NumberInput autoFocus inputMode="text" placeholder="e.g. (8 − 2) × 4 + 1" value={expr} onChange={(e) => setExpr(e.target.value)} disabled={over} aria-label="Expression" />
        {!over ? <Button type="submit">Check</Button> : <Button type="button" onClick={next}>Next <Kbd>Enter</Kbd></Button>}
      </form>
      {!over && <Button variant="quiet" onClick={() => end(false, 'Skipped.')}>Skip</Button>}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
