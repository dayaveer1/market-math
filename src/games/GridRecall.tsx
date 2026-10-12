'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, randInt, sample } from '@/lib/rng';
import { genPattern, gradePattern } from '@/lib/engines/cognitive';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd } from '@/components/ui';

export default function GridRecall({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const size = Number(settings.size), trials = Number(settings.trials), nDecoys = Number(settings.decoys), flash = Number(settings.flashMs);
  const maxCells = size * size - 1;
  const [k, setK] = useState(Math.min(maxCells, Number(settings.startCells)));
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState(() => genPattern(rng, size, Math.min(maxCells, Number(settings.startCells))));
  const [phase, setPhase] = useState<'show' | 'recall' | 'feedback'>('show');
  const [chosen, setChosen] = useState<number[]>([]);
  const [decoy, setDecoy] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ perfect: 0, hits: 0, decoyClicks: 0 });

  useEffect(() => {
    if (phase !== 'show') return;
    const id = window.setTimeout(() => setPhase('recall'), flash);
    return () => window.clearTimeout(id);
  }, [phase, flash, pattern]);

  // Decoys: red cells (never in the pattern) flash during recall.
  useEffect(() => {
    if (phase !== 'recall' || nDecoys === 0) return;
    const pool = Array.from({ length: size * size }, (_, c) => c).filter((c) => !pattern.includes(c));
    const cells = sample(rng, pool, Math.min(nDecoys, pool.length));
    const timers: number[] = [];
    cells.forEach((c, j) => {
      const at = 400 + j * 900 + randInt(rng, 0, 300);
      timers.push(window.setTimeout(() => setDecoy(c), at), window.setTimeout(() => setDecoy((d) => (d === c ? null : d)), at + 600));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase, nDecoys, pattern, rng, size]);

  const toggle = (c: number) => {
    if (phase !== 'recall') return;
    if (c === decoy) s.current.decoyClicks++;
    setChosen((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  };
  const submit = () => {
    if (phase !== 'recall') return;
    const g = gradePattern(pattern, chosen);
    s.current.hits += g.hits;
    if (g.perfect) s.current.perfect++;
    else onMistake({ prompt: `Grid ${size}×${size}, ${pattern.length} cells`, given: `${g.hits} hits, ${g.falseAlarms} wrong cells`, expected: `cells ${pattern.map((c) => c + 1).join(', ')}` });
    setFb({ ok: g.perfect, text: g.perfect ? 'Perfect' : `${g.hits} of ${pattern.length} found, ${g.falseAlarms} wrong` });
    setPhase('feedback');
    const nk = g.perfect ? Math.min(maxCells, k + 1) : Math.max(2, k - 1);
    window.setTimeout(() => {
      if (i + 1 >= trials) { onFinish({ score: s.current.hits, correct: s.current.perfect, total: trials, lines: [`${s.current.perfect} of ${trials} perfect`, `Largest pattern reached ${Math.max(k, nk)}`, `Decoy cells clicked: ${s.current.decoyClicks}`] }); return; }
      setK(nk); setI(i + 1); setPattern(genPattern(rng, size, nk)); setChosen([]); setFb({ ok: null, text: '' }); setPhase('show');
    }, 1200);
  };
  useKeys({ enter: submit });

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="num text-sm text-muted">Trial {i + 1} / {trials} · {pattern.length} cells</div>
      <div className="mx-auto grid aspect-square w-full max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }} data-testid="grid">
        {Array.from({ length: size * size }, (_, c) => {
          const lit = (phase === 'show' && pattern.includes(c)) || (phase === 'feedback' && pattern.includes(c));
          const sel = chosen.includes(c);
          const red = phase === 'recall' && decoy === c;
          return (
            <button key={c} aria-label={`cell ${c + 1}`} aria-pressed={sel} onClick={() => toggle(c)}
              className={`rounded-md border transition-colors ${red ? 'border-ask bg-ask' : lit ? 'border-accent bg-accent' : sel ? 'border-ink bg-ink/70' : 'border-line bg-surface hover:border-accent'} ${phase === 'feedback' && sel && !pattern.includes(c) ? 'ring-2 ring-ask' : ''}`} />
          );
        })}
      </div>
      {phase === 'recall' && <Button onClick={submit}>Submit <Kbd>Enter</Kbd></Button>}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
