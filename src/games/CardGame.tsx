'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as C from '@/lib/engines/cards';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat, TimeBar } from '@/components/ui';

export function PlayingCard({ rank, hidden }: { rank: number; hidden?: boolean }) {
  return (
    <div className={`num flex h-24 w-16 items-center justify-center rounded-lg border-2 text-2xl font-semibold ${hidden ? 'border-dashed border-line bg-paper text-muted' : 'border-ink/70 bg-surface'}`}>
      {hidden ? '?' : C.RANK_LABEL[rank]}
    </div>
  );
}
const describe = (r: C.CardRound, a: C.CardAction) => (a.kind === 'pass' ? 'pass' : `${a.kind} from ${r.quotes[a.quote].name} at ${a.kind === 'buy' ? r.quotes[a.quote].ask : r.quotes[a.quote].bid}`);

export default function CardGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const nRounds = Number(settings.rounds), nCards = Number(settings.cards), nRev = Number(settings.revealed), nQ = Number(settings.quoters), dt = Number(settings.decisionTime);
  const gen = () => C.generateRound(rng, nCards, nRev, nQ);
  const [i, setI] = useState(0);
  const [round, setRound] = useState(gen);
  const [done, setDone] = useState<C.CardAction | null>(null);
  const [pnl, setPnl] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const stats = useRef({ best: 0, ms: [] as number[] });
  const t0 = useRef(performance.now());

  const act = (a: C.CardAction) => {
    if (done) return;
    const p = C.actionPnl(round, a, 1);
    const best = C.bestAction(round);
    const isBest = JSON.stringify(best) === JSON.stringify(a) || Math.abs(C.actionEdge(round, a) - C.actionEdge(round, best)) < 1e-9;
    stats.current.ms.push(performance.now() - t0.current);
    if (isBest) stats.current.best++;
    else onMistake({ prompt: `Cards ${round.cards.map((c, k) => (round.revealed[k] ? C.RANK_LABEL[c] : '?')).join(' ')}; quotes ${round.quotes.map((q) => `${q.name} ${q.bid}/${q.ask}`).join(', ')}`, given: describe(round, a), expected: describe(round, best), explanation: `Fair value ${C.fairValue(round.cards, round.revealed).toFixed(2)}` });
    setPnl((x) => x + p);
    setDone(a);
    setFb({ ok: isBest, text: `${isBest ? 'Best choice' : `Best was to ${describe(round, best)}`}. Settled at ${C.settle(round)}; fair value was ${C.fairValue(round.cards, round.revealed).toFixed(2)}. Round P&L ${p >= 0 ? '+' : ''}${p}.` });
  };
  const next = () => {
    if (i + 1 >= nRounds) {
      onFinish({ score: pnl, correct: stats.current.best, total: nRounds, avgMs: stats.current.ms.reduce((a, b) => a + b, 0) / stats.current.ms.length, lines: [`${stats.current.best} of ${nRounds} rounds with the highest-EV action`] });
      return;
    }
    setI(i + 1); setRound(gen()); setDone(null); setFb({ ok: null, text: '' }); t0.current = performance.now();
  };
  const left = useCountdown(dt, !done, () => act({ kind: 'pass' }), i);
  useKeys({ p: () => act({ kind: 'pass' }), enter: () => done && next() });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Round" value={`${i + 1} / ${nRounds}`} />
        <Stat label="P&L" value={pnl} tone={pnl >= 0 ? 'bid' : 'ask'} />
        <div className="w-full sm:w-64"><TimeBar leftMs={left} totalMs={dt * 1000} /></div>
      </div>
      <p className="text-sm text-muted">Contract settles at the sum of all {nCards} cards.</p>
      <div className="flex flex-wrap gap-3">{round.cards.map((c, k) => <PlayingCard key={k} rank={c} hidden={!round.revealed[k] && !done} />)}</div>
      <div className="overflow-x-auto">
        <table className="num w-full text-left">
          <thead className="text-xs text-muted"><tr><th className="py-1">Quoter</th><th>Bid (you sell)</th><th>Ask (you buy)</th></tr></thead>
          <tbody>
            {round.quotes.map((q, k) => (
              <tr key={k} className="border-t border-line">
                <td className="py-2">{q.name}</td>
                <td><Button variant="outline" className="text-bid" disabled={!!done} onClick={() => act({ kind: 'sell', quote: k })}>{q.bid}</Button></td>
                <td><Button variant="outline" className="text-ask" disabled={!!done} onClick={() => act({ kind: 'buy', quote: k })}>{q.ask}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!done && <Button variant="quiet" onClick={() => act({ kind: 'pass' })}>Pass <Kbd>P</Kbd></Button>}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
      {done && <Button onClick={next}>{i + 1 >= nRounds ? 'See results' : 'Next round'} <Kbd>Enter</Kbd></Button>}
    </div>
  );
}
