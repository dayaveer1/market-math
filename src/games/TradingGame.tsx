'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as T from '@/lib/engines/tradingGame';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, Stat, TimeBar } from '@/components/ui';

const POS_LIMIT = 10;

export default function TradingGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const K = Number(settings.draws), dt = Number(settings.decisionTime), maxW = Number(settings.maxWidth), informed = Number(settings.informed) / 100, showFair = settings.showFair === true;
  const values = useMemo(() => T.drawValues(rng, K), [rng, K]);
  const [turn, setTurn] = useState(0); // number of revealed draws = turn
  const [phase, setPhase] = useState<'quote' | 'take' | 'end'>('quote');
  const [bid, setBid] = useState('');
  const [ask, setAsk] = useState('');
  const [acct, setAcct] = useState({ cash: 0, pos: 0 });
  const [book, setBook] = useState<T.Book | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const t0 = useRef(performance.now());
  const ms = useRef<number[]>([]);
  const goodTakes = useRef({ good: 0, total: 0 });

  const fair = T.publicFair(values, turn);
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 12));

  const toTake = () => { setBook(T.makeBook(rng, values, turn, 2)); setPhase('take'); t0.current = performance.now(); };

  const submitQuote = (timeout = false) => {
    if (phase !== 'quote') return;
    ms.current.push(performance.now() - t0.current);
    if (timeout) { push(`Turn ${turn + 1}: no quote`); toTake(); return; }
    const b = Number(bid), a = Number(ask);
    const err = bid === '' || ask === '' ? 'Enter both a bid and an ask.' : T.validateQuote(b, a, maxW);
    if (err) { ms.current.pop(); setFb({ ok: false, text: err }); return; }
    const r = T.counterpartyTrade(rng, values, turn, b, a, informed);
    if (r === 'buys' && acct.pos > -POS_LIMIT) { setAcct((x) => ({ cash: x.cash + a, pos: x.pos - 1 })); push(`Turn ${turn + 1}: counterparty bought 1 from you at ${a}`); }
    else if (r === 'sells' && acct.pos < POS_LIMIT) { setAcct((x) => ({ cash: x.cash - b, pos: x.pos + 1 })); push(`Turn ${turn + 1}: counterparty sold 1 to you at ${b}`); }
    else push(`Turn ${turn + 1}: no trade on your ${b} / ${a}`);
    if (!(b <= fair && fair <= a)) onMistake({ prompt: `Revealed ${values.slice(0, turn).join(', ') || 'nothing'}; ${K - turn} hidden draws of 1–20`, given: `${b} / ${a}`, expected: `Quote around fair ${fair.toFixed(1)}`, explanation: 'Fair = revealed sum + hidden × 10.5' });
    setFb({ ok: null, text: '' });
    toTake();
  };

  const take = (kind: 'buy' | 'sell' | 'pass') => {
    if (phase !== 'take' || !book) return;
    ms.current.push(performance.now() - t0.current);
    if (kind !== 'pass') {
      const lvl = kind === 'buy' ? book.asks[0] : book.bids[0];
      const qty = Math.max(0, Math.min(lvl.size, kind === 'buy' ? POS_LIMIT - acct.pos : POS_LIMIT + acct.pos));
      if (qty > 0) {
        setAcct((x) => ({ cash: x.cash + (kind === 'buy' ? -1 : 1) * lvl.px * qty, pos: x.pos + (kind === 'buy' ? qty : -qty) }));
        push(`Turn ${turn + 1}: you ${kind === 'buy' ? 'bought' : 'sold'} ${qty} at ${lvl.px} from ${lvl.who}`);
        goodTakes.current.total++;
        const edge = kind === 'buy' ? fair - lvl.px : lvl.px - fair;
        if (edge > 0) goodTakes.current.good++;
        else onMistake({ prompt: `Fair ${fair.toFixed(1)}, best bid ${book.bids[0].px}, best ask ${book.asks[0].px}`, given: `${kind} at ${lvl.px}`, expected: 'Only take prices on the right side of fair' });
      } else push('Position limit reached');
    }
    const nt = turn + 1;
    if (nt > K) { setPhase('end'); return; }
    setTurn(nt);
    if (nt === K) { setPhase('end'); return; }
    setPhase('quote'); setBid(''); setAsk(''); setBook(null); t0.current = performance.now();
  };

  const left = useCountdown(dt, phase !== 'end', () => (phase === 'quote' ? submitQuote(true) : take('pass')), `${turn}-${phase}`);
  useKeys({ b: () => take('buy'), s: () => take('sell'), p: () => take('pass'), enter: () => phase === 'end' && finish() });

  const settle = T.settleValue(values);
  const finish = () => {
    const pnl = T.accountPnl(acct.cash, acct.pos, settle);
    onFinish({ score: pnl, correct: goodTakes.current.good, total: goodTakes.current.total || undefined, avgMs: ms.current.reduce((a, b) => a + b, 0) / Math.max(1, ms.current.length), lines: [`Settlement ${settle} (${values.join(' + ')})`, `Final position ${acct.pos}, cash ${acct.cash}`, `${goodTakes.current.good} of ${goodTakes.current.total} takes had positive edge`] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Turn" value={`${Math.min(turn + 1, K)} / ${K}`} />
        <Stat label="Position" value={acct.pos} />
        <Stat label="Cash" value={acct.cash} />
        {showFair && <Stat label="Public fair value" value={fair.toFixed(1)} />}
        <div className="w-full sm:w-56"><TimeBar leftMs={phase === 'end' ? null : left} totalMs={dt * 1000} /></div>
      </div>
      <div>
        <div className="mb-2 text-sm text-muted">Draws (1–20 each, settles at the sum)</div>
        <div className="flex flex-wrap gap-2">
          {values.map((v, k) => <div key={k} className={`num flex h-12 w-12 items-center justify-center rounded-md border-2 text-lg font-semibold ${k < turn || phase === 'end' ? 'border-ink/70 bg-surface' : 'border-dashed border-line text-muted'}`}>{k < turn || phase === 'end' ? v : '?'}</div>)}
        </div>
      </div>
      {phase === 'quote' && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submitQuote(); }}>
          <div className="text-sm font-medium">Make a market (max spread {maxW})</div>
          <div className="flex flex-wrap gap-3">
            <NumberInput autoFocus className="!w-32" placeholder="Bid" value={bid} onChange={(e) => setBid(e.target.value)} aria-label="Bid" />
            <NumberInput className="!w-32" placeholder="Ask" value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Ask" />
            <Button type="submit">Quote</Button>
          </div>
        </form>
      )}
      {phase === 'take' && book && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Take from the book</div>
          <table className="num w-full max-w-md text-left text-sm">
            <thead className="text-xs text-muted"><tr><th>Bid size</th><th>Bid</th><th>Ask</th><th>Ask size</th></tr></thead>
            <tbody>{book.bids.map((bl, k) => (
              <tr key={k} className="border-t border-line"><td className="py-1">{bl.size}</td><td className="text-bid">{bl.px}</td><td className="text-ask">{book.asks[k].px}</td><td>{book.asks[k].size}</td></tr>
            ))}</tbody>
          </table>
          <div className="flex gap-2">
            <Button variant="bid" onClick={() => take('buy')}>Buy at {book.asks[0].px} <Kbd>B</Kbd></Button>
            <Button variant="ask" onClick={() => take('sell')}>Sell at {book.bids[0].px} <Kbd>S</Kbd></Button>
            <Button variant="quiet" onClick={() => take('pass')}>Pass <Kbd>P</Kbd></Button>
          </div>
        </div>
      )}
      {phase === 'end' && (
        <div className="space-y-3">
          <p>Settles at <span className="num font-semibold">{settle}</span>. P&L <span className="num font-semibold">{T.accountPnl(acct.cash, acct.pos, settle)}</span>.</p>
          <Button onClick={finish}>See results <Kbd>Enter</Kbd></Button>
        </div>
      )}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
      <ul className="num space-y-1 text-xs text-muted">{log.map((l, k) => <li key={k}>{l}</li>)}</ul>
    </div>
  );
}
