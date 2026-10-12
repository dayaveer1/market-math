'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { codeRound } from '@/lib/engines/cognitive';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Feedback, Kbd, TimeBar } from '@/components/ui';

export default function CodeMatch({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const rounds = Number(settings.rounds), len = Number(settings.length), nOpt = Number(settings.options), startMs = Number(settings.startMs), shrink = Number(settings.shrinkPct) / 100;
  const [i, setI] = useState(0);
  const [r, setR] = useState(() => codeRound(rng, len, nOpt));
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ correct: 0, ms: [] as number[] });
  const t0 = useRef(performance.now());
  const limitMs = Math.max(600, startMs * (1 - shrink) ** i);

  const choose = (k: number | null) => {
    const ok = k !== null && r.options[k] === r.target;
    if (ok) { s.current.correct++; s.current.ms.push(performance.now() - t0.current); }
    else onMistake({ prompt: `Target ${r.target}`, given: k === null ? '(time)' : r.options[k], expected: r.target });
    setFb({ ok, text: ok ? 'Match' : k === null ? 'Time' : `That was ${r.options[k]}` });
    if (i + 1 >= rounds) { onFinish({ score: s.current.correct, correct: s.current.correct, total: rounds, avgMs: s.current.ms.length ? s.current.ms.reduce((a, b) => a + b, 0) / s.current.ms.length : undefined, lines: [`Final time limit ${(limitMs / 1000).toFixed(2)}s`] }); return; }
    setI(i + 1); setR(codeRound(rng, len, nOpt)); t0.current = performance.now();
  };
  const left = useCountdown(limitMs / 1000, true, () => choose(null), i);
  useKeys(Object.fromEntries(r.options.map((_, k) => [String(k + 1), () => choose(k)])));

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="num text-sm text-muted">Round {i + 1} / {rounds}</div>
      <TimeBar leftMs={left} totalMs={limitMs} />
      <div className="num rounded-lg border border-line bg-surface py-6 text-4xl font-semibold tracking-widest" data-testid="target">{r.target}</div>
      <div className="grid grid-cols-2 gap-3">
        {r.options.map((o, k) => (
          <button key={k} onClick={() => choose(k)} className="num flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3 text-2xl tracking-widest hover:border-accent">
            <span>{o}</span><Kbd>{k + 1}</Kbd>
          </button>
        ))}
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
