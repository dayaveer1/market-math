'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import { betEV, generateGridRound, COLS } from '@/lib/engines/betGrid';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat, TimeBar } from '@/components/ui';

export default function BetGrid({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const rounds = Number(settings.rounds), rt = Number(settings.roundTime), nRev = Number(settings.revealed), nBets = Number(settings.bets);
  const [i, setI] = useState(0);
  const [r, setR] = useState(() => generateGridRound(rng, nRev, nBets));
  const [sel, setSel] = useState<boolean[]>(() => Array(nBets).fill(false));
  const [shown, setShown] = useState(false);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const s = useRef({ right: 0, total: 0, perfect: 0, evTaken: 0 });

  const submit = () => {
    if (shown) return;
    let right = 0, ev = 0;
    r.bets.forEach((b, k) => {
      const e = betEV(r.probs[k], b.odds);
      const good = e > 0;
      if (sel[k] === good) right++;
      else onMistake({ prompt: `${b.text} (grid ${r.dice.map((d, j) => (r.revealed[j] ? d : '?')).join(' ')})`, given: sel[k] ? 'took it' : 'left it', expected: `${good ? 'take' : 'leave'}: P = ${r.probs[k].toFixed(3)}, EV ${e >= 0 ? '+' : ''}${e.toFixed(3)} per unit` });
      if (sel[k]) ev += e;
    });
    s.current.right += right; s.current.total += r.bets.length; s.current.evTaken += ev;
    if (right === r.bets.length) s.current.perfect++;
    setShown(true);
    setFb({ ok: right === r.bets.length, text: `${right} of ${r.bets.length} bets classified correctly. Expected value of your selection: ${ev >= 0 ? '+' : ''}${ev.toFixed(3)} units.` });
  };
  const next = () => {
    if (i + 1 >= rounds) { const x = s.current; onFinish({ score: x.right, correct: x.right, total: x.total, lines: [`${x.perfect} of ${rounds} rounds perfect`, `Total expected value of bets taken: ${x.evTaken.toFixed(3)} units`] }); return; }
    setI(i + 1); setR(generateGridRound(rng, nRev, nBets)); setSel(Array(nBets).fill(false)); setShown(false); setFb({ ok: null, text: '' });
  };
  const left = useCountdown(rt, !shown, submit, i);
  useKeys({ ...Object.fromEntries(r.bets.map((_, k) => [String(k + 1), () => !shown && setSel((x) => x.map((v, j) => (j === k ? !v : v)))])), enter: () => (shown ? next() : submit()) });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Round" value={`${i + 1} / ${rounds}`} />
        <Stat label="Correct calls" value={`${s.current.right} / ${s.current.total}`} />
        <div className="w-full sm:w-56"><TimeBar leftMs={left} totalMs={rt * 1000} /></div>
      </div>
      <p className="text-sm text-muted">Each row is the sum of three fair dice. The winning row has the strictly highest sum; a tie for the top means no row wins. Select every bet with positive expected value.</p>
      <div className="mx-auto grid w-fit gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, 3.5rem) auto` }} data-testid="grid">
        {[0, 1, 2].map((row) => [
          ...[0, 1, 2].map((c) => { const j = row * COLS + c; const show = r.revealed[j] || shown; return <div key={j} className={`num flex h-14 w-14 items-center justify-center rounded-md border-2 text-2xl font-semibold ${show ? 'border-ink/70 bg-surface' : 'border-dashed border-line text-muted'}`}>{show ? r.dice[j] : '?'}</div>; }),
          <div key={`l${row}`} className="flex items-center pl-2 text-sm text-muted">Row {row + 1}</div>,
        ])}
      </div>
      <div className="space-y-2">
        {r.bets.map((b, k) => (
          <label key={k} className={`flex items-center gap-3 rounded-md border p-3 ${sel[k] ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}>
            <input type="checkbox" checked={sel[k]} disabled={shown} onChange={() => setSel((x) => x.map((v, j) => (j === k ? !v : v)))} />
            <Kbd>{k + 1}</Kbd><span className="flex-1">{b.text}</span>
            {shown && <span className={`num text-sm ${betEV(r.probs[k], b.odds) > 0 ? 'text-bid' : 'text-ask'}`}>P {r.probs[k].toFixed(3)} · EV {betEV(r.probs[k], b.odds).toFixed(3)}</span>}
          </label>
        ))}
      </div>
      <Button onClick={shown ? next : submit}>{shown ? (i + 1 >= rounds ? 'See results' : 'Next round') : 'Lock in bets'} <Kbd>Enter</Kbd></Button>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
