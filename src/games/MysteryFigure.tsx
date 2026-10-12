'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { consistentSolverAttempts, feedback, randomCode, remainingCandidates } from '@/lib/engines/mystery';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat } from '@/components/ui';

const SYMS = ['●', '▲', '■', '★', '◆', '✚', '⬟', '☾'];

export default function MysteryFigure({ settings, seed, onFinish }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const len = Number(settings.length), nSym = Number(settings.symbols), nP = Number(settings.puzzles);
  const [i, setI] = useState(0);
  const [secret, setSecret] = useState(() => randomCode(rng, len, nSym));
  const [guess, setGuess] = useState<number[]>([]);
  const [hist, setHist] = useState<{ guess: number[]; score: number }[]>([]);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ ratios: [] as number[], attempts: [] as number[], bench: [] as number[] });
  const solved = hist.length > 0 && hist[hist.length - 1].score === len;
  const remaining = useMemo(() => remainingCandidates(hist, len, nSym), [hist, len, nSym]);

  const add = (k: number) => { if (!solved && k < nSym && guess.length < len) setGuess((g) => [...g, k]); };
  const submit = () => {
    if (solved) { next(); return; }
    if (guess.length !== len) { setFb({ ok: false, text: `Pick ${len} symbols.` }); return; }
    const score = feedback(secret, guess);
    const h = [...hist, { guess, score }];
    setHist(h); setGuess([]);
    if (score === len) {
      const bench = consistentSolverAttempts(secret, nSym);
      s.current.ratios.push(Math.min(1.5, bench / h.length)); s.current.attempts.push(h.length); s.current.bench.push(bench);
      setFb({ ok: true, text: `Solved in ${h.length} attempts. A simple consistent-guess strategy needed ${bench}.` });
    } else setFb({ ok: null, text: '' });
  };
  const next = () => {
    if (i + 1 >= nP) {
      const x = s.current, sum = (a: number[]) => a.reduce((u, v) => u + v, 0);
      onFinish({ score: Math.round((sum(x.ratios) / x.ratios.length) * 100), correct: x.attempts.filter((a, k) => a <= x.bench[k]).length, total: nP, lines: [`Attempts: ${x.attempts.join(', ')} (benchmark ${x.bench.join(', ')})`, 'Score is benchmark ÷ your attempts, averaged (100% = as efficient as the benchmark).'] });
      return;
    }
    setI(i + 1); setSecret(randomCode(rng, len, nSym)); setHist([]); setGuess([]); setFb({ ok: null, text: '' });
  };
  useKeys({ ...Object.fromEntries(Array.from({ length: nSym }, (_, k) => [String(k + 1), () => add(k)])), backspace: () => setGuess((g) => g.slice(0, -1)), enter: submit });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex justify-between"><Stat label="Puzzle" value={`${i + 1} / ${nP}`} /><Stat label="Attempts" value={hist.length} /><Stat label="Possible figures left" value={remaining} /></div>
      <div className="flex justify-center gap-2" aria-label="Current guess">
        {Array.from({ length: len }, (_, k) => <div key={k} className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-line bg-surface text-3xl">{guess[k] !== undefined ? SYMS[guess[k]] : ''}</div>)}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SYMS.slice(0, nSym).map((sym, k) => <Button key={k} variant="outline" className="text-2xl" onClick={() => add(k)} disabled={solved}>{sym}<Kbd>{k + 1}</Kbd></Button>)}
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="quiet" onClick={() => setGuess((g) => g.slice(0, -1))} disabled={solved}>Remove</Button>
        <Button onClick={submit}>{solved ? (i + 1 >= nP ? 'See results' : 'Next figure') : 'Submit'} <Kbd>Enter</Kbd></Button>
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
      <ol className="space-y-1">
        {hist.map((h, k) => (
          <li key={k} className="num flex items-center justify-center gap-4 text-xl"><span className="text-sm text-muted">{k + 1}.</span><span>{h.guess.map((g) => SYMS[g]).join(' ')}</span><span className="text-base">{h.score} in place</span></li>
        ))}
      </ol>
    </div>
  );
}
