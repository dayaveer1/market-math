'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { nextSwitchTrial, type SwitchTrial } from '@/lib/engines/cognitive';
import { useCountdown } from '@/hooks/useCountdown';
import { adaptWindow } from '@/lib/adaptive';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, TimeBar } from '@/components/ui';

export default function TaskSwitch({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const duration = Number(settings.duration), p = Number(settings.switchPct) / 100, startWindow = Number(settings.window), adaptive = settings.adaptive === true;
  const [windowMs, setWindowMs] = useState(startWindow);
  const [trial, setTrial] = useState<SwitchTrial>(() => nextSwitchTrial(rng, null, p));
  const [n, setN] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ correct: 0, wrong: 0, timeouts: 0, rtSwitch: [] as number[], rtRepeat: [] as number[] });
  const t0 = useRef(performance.now());
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const x = s.current, mean = (a: number[]) => (a.length ? a.reduce((u, v) => u + v, 0) / a.length : 0);
    const all = [...x.rtSwitch, ...x.rtRepeat];
    onFinish({ score: x.correct - x.wrong, correct: x.correct, total: x.correct + x.wrong + x.timeouts, avgMs: mean(all), lines: [`${x.correct} correct, ${x.wrong} wrong, ${x.timeouts} too slow`, ...(adaptive ? [`Final response window ${windowMs} ms`] : []), x.rtSwitch.length && x.rtRepeat.length ? `Switch cost ${Math.round(mean(x.rtSwitch) - mean(x.rtRepeat))} ms (switch ${Math.round(mean(x.rtSwitch))} vs repeat ${Math.round(mean(x.rtRepeat))})` : 'Switch cost needs correct answers on both switch and repeat trials'] });
  }, [adaptive, onFinish, windowMs]);
  const left = useCountdown(duration, true, finish);

  const respond = useCallback((key: 'F' | 'J' | null) => {
    if (done.current) return;
    const rt = performance.now() - t0.current;
    const x = s.current;
    if (adaptive) setWindowMs((w) => adaptWindow(w, key === trial.key, 400, startWindow * 2));
    if (key === null) { x.timeouts++; setFb({ ok: false, text: 'Too slow' }); }
    else if (key === trial.key) { x.correct++; (trial.isSwitch ? x.rtSwitch : x.rtRepeat).push(rt); setFb({ ok: true, text: `${Math.round(rt)} ms` }); }
    else { x.wrong++; setFb({ ok: false, text: 'Wrong' }); onMistake({ prompt: `${trial.digit} under the ${trial.rule === 'parity' ? 'odd/even' : 'below/above 5'} rule`, given: key, expected: trial.key }); }
    setTrial((t) => nextSwitchTrial(rng, t, p));
    setN((v) => v + 1);
    t0.current = performance.now();
  }, [adaptive, onMistake, p, rng, startWindow, trial]);

  useEffect(() => {
    const id = window.setTimeout(() => respond(null), windowMs);
    return () => window.clearTimeout(id);
  }, [n, respond, windowMs]);
  useKeys({ f: () => respond('F'), j: () => respond('J') });

  const parity = trial.rule === 'parity';
  return (
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <TimeBar leftMs={left} totalMs={duration * 1000} />
      <div className="grid grid-cols-2 gap-4 text-sm text-muted">
        <div className="rounded-md border-2 border-accent p-2">Blue frame: odd <Kbd>F</Kbd> · even <Kbd>J</Kbd></div>
        <div className="rounded-md border-2 border-amber-500 p-2">Amber frame: below 5 <Kbd>F</Kbd> · above 5 <Kbd>J</Kbd></div>
      </div>
      <div className={`num mx-auto flex h-40 w-40 items-center justify-center rounded-xl border-8 text-7xl font-semibold ${parity ? 'border-accent' : 'border-amber-500'}`} data-testid="stimulus" aria-label={`${trial.digit}, ${parity ? 'odd or even' : 'below or above five'}`}>{trial.digit}</div>
      <div className="flex justify-center gap-4">
        <Button variant="outline" className="w-32" onClick={() => respond('F')}>{parity ? 'Odd' : 'Below 5'} <Kbd>F</Kbd></Button>
        <Button variant="outline" className="w-32" onClick={() => respond('J')}>{parity ? 'Even' : 'Above 5'} <Kbd>J</Kbd></Button>
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
