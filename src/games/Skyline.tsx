'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, randInt } from '@/lib/rng';
import { CAPACITY, applyMove, generateProblem, key, type State } from '@/lib/engines/skyline';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat } from '@/components/ui';

const COLOR: Record<string, string> = { R: 'bg-ask', G: 'bg-bid', B: 'bg-accent' };
function Towers({ s, held, onPick, small }: { s: State; held?: number | null; onPick?: (k: number) => void; small?: boolean }) {
  const h = small ? 'h-5 w-10' : 'h-9 w-16';
  return (
    <div className="flex items-end justify-center gap-4">
      {s.map((peg, k) => (
        <button key={k} disabled={!onPick} onClick={() => onPick?.(k)} aria-label={`Tower ${k + 1}`}
          className={`flex flex-col-reverse items-center gap-1 rounded-md border-b-4 px-2 pt-2 ${held === k ? 'border-accent bg-accent/10' : 'border-ink/60'} ${onPick ? 'hover:bg-line/40' : ''}`}
          style={{ minHeight: `${(small ? 24 : 40) * CAPACITY[k] + 12}px` }}>
          {peg.map((c, j) => <div key={j} className={`${h} rounded ${COLOR[c]}`} />)}
        </button>
      ))}
    </div>
  );
}

export default function Skyline({ settings, seed, onFinish }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const nP = Number(settings.puzzles), lo = Number(settings.minMoves), hi = Math.max(lo, Number(settings.maxMoves));
  const gen = () => generateProblem(rng, randInt(rng, lo, hi));
  const [i, setI] = useState(0);
  const [prob, setProb] = useState(gen);
  const [state, setState] = useState<State>(prob.start);
  const [history, setHistory] = useState<State[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ eff: [] as number[], plan: [] as number[], perfect: 0 });
  const t0 = useRef(performance.now());
  const firstMove = useRef<number | null>(null);
  const solved = key(state) === key(prob.goal);

  const pickTower = (k: number) => {
    if (solved) return;
    if (held === null) { if (state[k].length) setHeld(k); return; }
    if (held === k) { setHeld(null); return; }
    if (state[k].length >= CAPACITY[k]) { setFb({ ok: false, text: `Tower ${k + 1} is full.` }); return; }
    if (firstMove.current === null) firstMove.current = performance.now() - t0.current;
    const ns = applyMove(state, [held, k]);
    setHistory((h) => [...h, state]);
    setState(ns);
    setHeld(null);
    if (key(ns) === key(prob.goal)) {
      const moves = history.length + 1;
      const e = prob.optimal / moves;
      s.current.eff.push(e); s.current.plan.push(firstMove.current ?? 0);
      if (moves === prob.optimal) s.current.perfect++;
      setFb({ ok: moves === prob.optimal, text: `Solved in ${moves} moves (best possible ${prob.optimal}).` });
    } else setFb({ ok: null, text: '' });
  };
  const undo = () => { if (!history.length || solved) return; setState(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setHeld(null); };
  const next = () => {
    if (i + 1 >= nP) {
      const x = s.current, mean = (a: number[]) => a.reduce((u, v) => u + v, 0) / a.length;
      onFinish({ score: Math.round(mean(x.eff) * 100), correct: x.perfect, total: nP, lines: [`${x.perfect} of ${nP} solved in the minimum number of moves`, `Average planning time before first move ${(mean(x.plan) / 1000).toFixed(1)}s`] });
      return;
    }
    const p = gen();
    setI(i + 1); setProb(p); setState(p.start); setHistory([]); setHeld(null); setFb({ ok: null, text: '' }); firstMove.current = null; t0.current = performance.now();
  };
  useKeys({ '1': () => pickTower(0), '2': () => pickTower(1), '3': () => pickTower(2), u: undo, enter: () => solved && next() });

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="flex justify-between"><Stat label="Puzzle" value={`${i + 1} / ${nP}`} /><Stat label="Moves" value={history.length} /><Stat label="Minimum" value={prob.optimal} /></div>
      <div><div className="mb-2 text-sm text-muted">Goal</div><Towers s={prob.goal} small /></div>
      <div><div className="mb-2 text-sm text-muted">Your towers</div><Towers s={state} held={held} onPick={pickTower} /></div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={undo} disabled={!history.length || solved}>Undo <Kbd>U</Kbd></Button>
        {solved && <Button onClick={next}>{i + 1 >= nP ? 'See results' : 'Next puzzle'} <Kbd>Enter</Kbd></Button>}
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
