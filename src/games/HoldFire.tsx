'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { isGo, nextStim, randomCue, type HoldCue, type HoldStim } from '@/lib/engines/cognitive';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd } from '@/components/ui';

const HUE_CLASS = { blue: 'fill-accent', orange: 'fill-amber-500', green: 'fill-bid' } as const;
function Shape({ s }: { s: HoldStim }) {
  const c = HUE_CLASS[s.hue];
  return (
    <svg viewBox="-50 -50 100 100" width={120} height={120} aria-label={`${s.hue} ${s.shape}`}>
      {s.shape === 'circle' && <circle r={40} className={c} />}
      {s.shape === 'square' && <rect x={-36} y={-36} width={72} height={72} className={c} />}
      {s.shape === 'triangle' && <polygon points="0,-42 40,34 -40,34" className={c} />}
    </svg>
  );
}

export default function HoldFire({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const trials = Number(settings.trials), w0 = Number(settings.startWindow), wMin = Number(settings.minWindow), cueEvery = Number(settings.cueEvery), goP = Number(settings.goPct) / 100;
  const [cue, setCue] = useState<HoldCue>(() => randomCue(rng));
  const [stim, setStim] = useState<HoldStim>(() => nextStim(rng, cue, goP));
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ hits: 0, misses: 0, fa: 0, cr: 0, rt: [] as number[] });
  const t0 = useRef(performance.now());
  const responded = useRef(false);
  const windowMs = Math.max(wMin, w0 - (w0 - wMin) * (i / Math.max(1, trials - 1)));

  const advance = useCallback(() => {
    if (i + 1 >= trials) {
      const x = s.current;
      onFinish({ score: Math.round(((x.hits + x.cr) / trials) * 100), correct: x.hits + x.cr, total: trials, avgMs: x.rt.length ? x.rt.reduce((a, b) => a + b, 0) / x.rt.length : undefined, lines: [`Hits ${x.hits}, misses ${x.misses}`, `False alarms ${x.fa}, correct holds ${x.cr}`, `Final window ${Math.round(windowMs)} ms`] });
      return;
    }
    setVisible(false);
    window.setTimeout(() => {
      const ni = i + 1;
      const nc = ni % cueEvery === 0 ? randomCue(rng) : cue;
      if (nc !== cue) setCue(nc);
      setStim(nextStim(rng, nc, goP)); setI(ni); setVisible(true); responded.current = false; t0.current = performance.now();
    }, 250);
  }, [cue, cueEvery, goP, i, onFinish, rng, trials, windowMs]);

  const cueText = `${cue.kind === 'color' ? 'anything' : 'any'} ${cue.value}${cue.kind === 'color' ? '' : ''}`;
  const fire = () => {
    if (!visible || responded.current) return;
    responded.current = true;
    if (isGo(cue, stim)) { s.current.hits++; s.current.rt.push(performance.now() - t0.current); setFb({ ok: true, text: `${Math.round(performance.now() - t0.current)} ms` }); }
    else { s.current.fa++; setFb({ ok: false, text: 'Hold fire!' }); onMistake({ prompt: `Cue: fire on ${cueText}; stimulus ${stim.hue} ${stim.shape}`, given: 'fired', expected: 'hold' }); }
    advance();
  };
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      if (responded.current) return;
      responded.current = true;
      if (isGo(cue, stim)) { s.current.misses++; setFb({ ok: false, text: 'Missed target' }); onMistake({ prompt: `Cue: fire on ${cueText}; stimulus ${stim.hue} ${stim.shape}`, given: 'held', expected: 'fire' }); }
      else { s.current.cr++; setFb({ ok: true, text: 'Held' }); }
      advance();
    }, windowMs);
    return () => window.clearTimeout(id);
  }, [visible, i, windowMs, cue, stim, advance, onMistake, cueText]);
  useKeys({ ' ': (e) => { e.preventDefault(); fire(); } });

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="num text-sm text-muted">Trial {i + 1} / {trials} · window {Math.round(windowMs)} ms</div>
      <div className="rounded-md border border-line bg-surface py-3 text-lg">Fire on <span className="font-semibold">{cueText}</span></div>
      <div className="flex h-40 items-center justify-center" data-testid="stimulus">{visible && <Shape s={stim} />}</div>
      <Button className="w-40" onClick={fire}>Fire <Kbd>Space</Kbd></Button>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
