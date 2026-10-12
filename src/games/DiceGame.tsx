'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as D from '@/lib/engines/dice';
import { parseAnswer } from '@/lib/parse';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, Stat, TimeBar } from '@/components/ui';

const START = 500;

function Die({ face, hidden, value }: { face: number; hidden: boolean; value: number }) {
  return (
    <div className={`num flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 text-2xl font-semibold ${hidden ? 'border-dashed border-line bg-paper text-muted' : 'border-ink/70 bg-surface'}`}>
      {hidden ? '?' : face}
      {!hidden && value !== face && <span className="text-[10px] text-accent">worth {value}</span>}
    </div>
  );
}

export default function DiceGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const nDice = Number(settings.dice), nRounds = Number(settings.rounds), dt = Number(settings.decisionTime);
  const showBalance = settings.showBalance === true, events = settings.events === true;
  const [roundNo, setRoundNo] = useState(0);
  const [round, setRound] = useState(() => D.generateRound(rng, nDice, events));
  const [balance, setBalance] = useState(START);
  const [phase, setPhase] = useState<'trade' | 'report' | 'next'>('trade');
  const [side, setSide] = useState<D.Side>('buy');
  const [qty, setQty] = useState('');
  const [err, setErr] = useState('');
  const [trade, setTrade] = useState<{ side: D.Side; qty: number } | null>(null);
  const [repRet, setRepRet] = useState('');
  const [repBal, setRepBal] = useState('');
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const reports = useRef({ correct: 0, total: 0 });
  const tradeMs = useRef<number[]>([]);
  const t0 = useRef(performance.now());

  const roundPnl = trade ? D.pnl(round, trade.side, trade.qty) : 0;

  const commit = (t: { side: D.Side; qty: number } | null) => {
    tradeMs.current.push(performance.now() - t0.current);
    if (t && D.edgePerUnit(round, t.side) < 0) {
      onMistake({ prompt: `Dice ${round.faces.map((f, i) => (round.hidden[i] ? '?' : f)).join(' ')} · quote ${round.bid} at ${round.ask}${round.event !== 'none' ? ' · ' + D.EVENT_LABEL[round.event] : ''}`, given: `${t.side} ${t.qty}`, expected: `Fair value ${D.fairValue(round).toFixed(2)}: ${D.edgePerUnit(round, t.side === 'buy' ? 'sell' : 'buy') > 0 ? (t.side === 'buy' ? 'sell' : 'buy') : 'pass'}`, explanation: 'Trades should have positive expected value.' });
    }
    setTrade(t);
    setBalance((b) => b + (t ? D.pnl(round, t.side, t.qty) : 0));
    setPhase('report');
    setFb({ ok: null, text: '' });
  };

  const submitTrade = () => {
    const q = parseInt(qty, 10);
    const v = D.validateOrder(round, side, q, balance);
    if (!v.ok) { setErr(v.reason!); return; }
    setErr('');
    commit({ side, qty: q });
  };

  const left = useCountdown(dt, phase === 'trade', () => commit(null), roundNo);

  const submitReport = () => {
    const r = parseAnswer(repRet);
    if (r === null) { setFb({ ok: false, text: 'Enter your return for the round, e.g. -12 or 30.' }); return; }
    let ok = Math.abs(r - roundPnl) < 1e-9;
    let text = ok ? `Correct: ${roundPnl >= 0 ? '+' : ''}${roundPnl}` : `Your return was ${roundPnl >= 0 ? '+' : ''}${roundPnl}`;
    if (!showBalance) {
      const b = parseAnswer(repBal);
      const bok = b !== null && Math.abs(b - balance) < 1e-9;
      ok = ok && bok;
      text += bok ? ' · balance correct' : ` · balance is ${balance}`;
    }
    reports.current.total++;
    if (ok) reports.current.correct++;
    else onMistake({ prompt: `Report return: ${trade ? `${trade.side} ${trade.qty} @ ${trade.side === 'buy' ? round.ask : round.bid}` : 'no trade'}, settlement ${D.settlement(round)}`, given: repRet + (showBalance ? '' : ` / balance ${repBal}`), expected: `${roundPnl}${showBalance ? '' : ` / balance ${balance}`}` });
    setFb({ ok, text });
    setPhase('next');
  };

  const next = () => {
    if (roundNo + 1 >= nRounds) {
      const pnl = balance - START;
      onFinish({ score: pnl, correct: reports.current.correct, total: reports.current.total, avgMs: tradeMs.current.reduce((a, b) => a + b, 0) / tradeMs.current.length, lines: [`Final balance ${balance}`, `${reports.current.correct} of ${reports.current.total} return reports correct`] });
      return;
    }
    setRoundNo(roundNo + 1);
    setRound(D.generateRound(rng, nDice, events));
    setPhase('trade'); setQty(''); setRepRet(''); setRepBal(''); setTrade(null); setFb({ ok: null, text: '' });
    t0.current = performance.now();
  };

  useKeys({ b: () => phase === 'trade' && setSide('buy'), s: () => phase === 'trade' && setSide('sell'), p: () => phase === 'trade' && commit(null), enter: () => phase === 'next' && next() });

  const reveal = phase !== 'trade';
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Round" value={`${roundNo + 1} / ${nRounds}`} />
        <Stat label="Balance" value={showBalance ? balance : 'hidden'} />
        <div className="w-full sm:w-64"><TimeBar leftMs={left} totalMs={dt * 1000} /></div>
      </div>
      {round.event !== 'none' && <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">Market event: {D.EVENT_LABEL[round.event]}</div>}
      <div className="flex flex-wrap gap-3" data-testid="dice">
        {round.faces.map((f, i) => <Die key={i} face={f} hidden={round.hidden[i] && !reveal} value={D.faceValue(f, round.event)} />)}
      </div>
      <div className="num text-3xl font-semibold"><span className="text-bid">{round.bid}</span> <span className="text-lg text-muted">at</span> <span className="text-ask">{round.ask}</span></div>

      {phase === 'trade' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submitTrade(); }}>
          <div className="flex gap-2">
            <Button type="button" variant={side === 'buy' ? 'bid' : 'outline'} onClick={() => setSide('buy')}>Buy at {round.ask} <Kbd>B</Kbd></Button>
            <Button type="button" variant={side === 'sell' ? 'ask' : 'outline'} onClick={() => setSide('sell')}>Sell at {round.bid} <Kbd>S</Kbd></Button>
            <Button type="button" variant="quiet" onClick={() => commit(null)}>Pass <Kbd>P</Kbd></Button>
          </div>
          <div className="flex gap-3">
            <NumberInput autoFocus inputMode="numeric" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity"
              onKeyDown={(e) => { const k = e.key.toLowerCase(); if (k === 'b' || k === 's' || k === 'p') { e.preventDefault(); if (k === 'p') commit(null); else setSide(k === 'b' ? 'buy' : 'sell'); } }} />
            <Button type="submit">Trade</Button>
          </div>
          {err && <p className="text-sm text-ask">{err}</p>}
        </form>
      )}
      {phase === 'report' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submitReport(); }}>
          <p className="text-sm">Settlement: <span className="num font-semibold">{D.settlement(round)}</span>. {trade ? `You ${trade.side === 'buy' ? 'bought' : 'sold'} ${trade.qty} at ${trade.side === 'buy' ? round.ask : round.bid}.` : 'You did not trade.'}</p>
          <div className="flex gap-3">
            <NumberInput autoFocus placeholder="Your return this round" value={repRet} onChange={(e) => setRepRet(e.target.value)} aria-label="Return this round" />
            {!showBalance && <NumberInput placeholder="New balance" value={repBal} onChange={(e) => setRepBal(e.target.value)} aria-label="New balance" />}
            <Button type="submit">Report</Button>
          </div>
        </form>
      )}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
      {phase === 'next' && <Button onClick={next}>{roundNo + 1 >= nRounds ? 'See results' : 'Next round'} <Kbd>Enter</Kbd></Button>}
    </div>
  );
}
