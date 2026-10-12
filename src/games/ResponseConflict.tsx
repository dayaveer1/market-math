'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { nextConflictTrial, type ConflictTrial } from '@/lib/engines/cognitive';
import { useKeys } from '@/hooks/useKeys';
import { adaptWindow } from '@/lib/adaptive';
import { Button, Feedback, Kbd } from '@/components/ui';

export default function ResponseConflict({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const task = String(settings.task) as 'flanker' | 'simon' | 'mixed', trials = Number(settings.trials), cong = Number(settings.congruentPct) / 100, startWindow = Number(settings.window), adaptive = settings.adaptive === true;
  const [windowMs, setWindowMs] = useState(startWindow);
  const [i, setI] = useState(0);
  const [trial, setTrial] = useState<ConflictTrial>(() => nextConflictTrial(rng, task, cong));
  const [blank, setBlank] = useState(false);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ correct: 0, rtC: [] as number[], rtI: [] as number[], errC: 0, errI: 0 });
  const t0 = useRef(performance.now());

  const respond = useCallback((key: 'F' | 'J' | null) => {
    if (blank) return;
    const rt = performance.now() - t0.current;
    const x = s.current;
    const ok = key === trial.key;
    if (adaptive) setWindowMs((w) => adaptWindow(w, ok, 300, startWindow * 2));
    if (ok) { x.correct++; (trial.congruent ? x.rtC : x.rtI).push(rt); }
    else { if (trial.congruent) x.errC++; else x.errI++; onMistake({ prompt: trial.task === 'flanker' ? `Flanker ${trial.display}` : `Simon: ${trial.color} square on the ${trial.side}`, given: key ?? '(too slow)', expected: trial.key }); }
    setFb({ ok, text: key === null ? 'Too slow' : ok ? `${Math.round(rt)} ms` : 'Wrong' });
    if (i + 1 >= trials) {
      const mean = (a: number[]) => (a.length ? a.reduce((u, v) => u + v, 0) / a.length : null);
      const mc = mean(x.rtC), mi = mean(x.rtI);
      const cost = mc !== null && mi !== null ? `Interference cost ${Math.round(mi - mc)} ms (incongruent ${Math.round(mi)} vs congruent ${Math.round(mc)})` : 'Interference cost needs at least one correct congruent and incongruent trial';
      onFinish({ score: Math.round((x.correct / trials) * 100), correct: x.correct, total: trials, avgMs: mean([...x.rtC, ...x.rtI]) ?? undefined, lines: [cost, `Errors: ${x.errC} congruent, ${x.errI} incongruent`, ...(adaptive ? [`Final response window ${windowMs} ms`] : [])] });
      return;
    }
    setBlank(true);
    window.setTimeout(() => { setTrial(nextConflictTrial(rng, task, cong)); setI((v) => v + 1); setBlank(false); t0.current = performance.now(); }, 300);
  }, [adaptive, blank, cong, i, onFinish, onMistake, rng, startWindow, task, trial, trials, windowMs]);

  useEffect(() => {
    if (blank) return;
    const id = window.setTimeout(() => respond(null), windowMs);
    return () => window.clearTimeout(id);
  }, [i, blank, respond, windowMs]);
  useKeys({ f: () => respond('F'), j: () => respond('J') });

  return (
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <div className="num text-sm text-muted">Trial {i + 1} / {trials}</div>
      <p className="text-sm text-muted">{trial.task === 'flanker' ? <>Middle arrow: ← <Kbd>F</Kbd> → <Kbd>J</Kbd></> : <>Colour: red <Kbd>F</Kbd> blue <Kbd>J</Kbd>, ignore the side</>}</p>
      <div className="relative mx-auto flex h-40 w-full max-w-md items-center justify-center rounded-xl border border-line bg-surface" data-testid="stimulus">
        {!blank && (trial.task === 'flanker'
          ? <span className="num text-6xl font-semibold tracking-[0.3em]">{trial.display.replace(/</g, '←').replace(/>/g, '→')}</span>
          : <span className={`absolute top-1/2 h-16 w-16 -translate-y-1/2 rounded ${trial.color === 'red' ? 'bg-ask' : 'bg-accent'} ${trial.side === 'left' ? 'left-8' : 'right-8'}`} aria-label={`${trial.color} square on the ${trial.side}`} />)}
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="outline" className="w-28" onClick={() => respond('F')}><Kbd>F</Kbd></Button>
        <Button variant="outline" className="w-28" onClick={() => respond('J')}><Kbd>J</Kbd></Button>
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
