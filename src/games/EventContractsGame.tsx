'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as E from '@/lib/engines/events';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, Stat, TimeBar } from '@/components/ui';

export default function EventContractsGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const nR = Number(settings.rounds), nSig = Number(settings.signals), inf = Number(settings.informed) / 100, maxW = Number(settings.maxWidth), nT = Number(settings.traders), dt = Number(settings.decisionTime);
  const [i, setI] = useState(0);
  const [sc, setSc] = useState(() => E.generateScenario(rng, nSig));
  const [bid, setBid] = useState('');
  const [ask, setAsk] = useState('');
  const [res, setRes] = useState<{ fills: E.Fill[]; pnl: number; cal: number } | null>(null);
  const [tot, setTot] = useState({ pnl: 0, cal: 0 });
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const briers = useRef<number[]>([]);
  const good = useRef(0);
  const t0 = useRef(performance.now());
  const ms = useRef<number[]>([]);

  const submit = (timeout = false) => {
    if (res) return;
    ms.current.push(performance.now() - t0.current);
    const fair = sc.trueProb * 100;
    if (timeout) {
      briers.current.push(0.25);
      onMistake({ prompt: sc.title, given: '(no quote)', expected: `about ${fair.toFixed(1)}¢` });
      setRes({ fills: [], pnl: 0, cal: 0 });
      setFb({ ok: false, text: `Time. No quote, no trades. Fair value was ${fair.toFixed(1)}¢; outcome ${sc.outcome ? 'YES' : 'NO'}.` });
      return;
    }
    const b = bid === '' ? NaN : Number(bid), a = ask === '' ? NaN : Number(ask);
    const err = E.validateQuote(b, a, maxW);
    if (err) { ms.current.pop(); setFb({ ok: false, text: err }); return; }
    const fills = E.simulateFlow(rng, sc, b, a, nT, inf);
    const pnl = E.settleFills(fills, sc.outcome);
    const mid = (a + b) / 2;
    const cal = E.calibrationPoints(mid, sc.outcome);
    briers.current.push(E.brier(mid, sc.outcome));
    if (b <= fair && fair <= a) good.current++;
    else onMistake({ prompt: `${sc.title} Base rate ${sc.baseRate * 100}%. ${sc.signals.map((x) => x.text).join(' ')}`, given: `${b} / ${a}`, expected: `Fair probability ${fair.toFixed(1)}¢ should sit inside your quote`, explanation: 'Posterior odds = prior odds × each likelihood ratio.' });
    setRes({ fills, pnl, cal });
    setTot((t) => ({ pnl: t.pnl + pnl, cal: t.cal + cal }));
    setFb({ ok: pnl + cal >= 0, text: `${sc.outcome ? 'YES' : 'NO'}. Fair value was ${fair.toFixed(1)}¢. ${fills.length} fills, P&L ${pnl >= 0 ? '+' : ''}${pnl}¢, calibration ${cal >= 0 ? '+' : ''}${cal}.` });
  };
  const next = () => {
    if (i + 1 >= nR) {
      const mb = briers.current.reduce((x, y) => x + y, 0) / briers.current.length;
      onFinish({ score: tot.pnl + tot.cal, correct: good.current, total: nR, avgMs: ms.current.reduce((x, y) => x + y, 0) / ms.current.length, lines: [`P&L ${tot.pnl}¢ · calibration ${tot.cal}`, `Mean Brier score ${mb.toFixed(3)} (0 is perfect, 0.25 is a coin flip)`, `${good.current} of ${nR} quotes contained the fair probability`] });
      return;
    }
    setI(i + 1); setSc(E.generateScenario(rng, nSig)); setBid(''); setAsk(''); setRes(null); setFb({ ok: null, text: '' }); t0.current = performance.now();
  };
  const left = useCountdown(dt, !res, () => submit(true), i);
  useKeys({ enter: () => res && next() });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Event" value={`${i + 1} / ${nR}`} />
        <Stat label="Points" value={tot.pnl + tot.cal} tone={tot.pnl + tot.cal >= 0 ? 'bid' : 'ask'} />
        <div className="w-full sm:w-64"><TimeBar leftMs={left} totalMs={dt * 1000} /></div>
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-semibold">{sc.title}</p>
        <p>Base rate for events like this: <span className="num font-semibold">{sc.baseRate * 100}%</span></p>
        <ul className="list-disc space-y-1 pl-5 text-sm">{sc.signals.map((s, k) => <li key={k}>{s.text}</li>)}</ul>
        <p className="text-xs text-muted">Contract pays 100¢ on YES. Maximum spread {maxW}¢. {Math.round(inf * 100)}% of traders know the outcome.</p>
      </div>
      {!res ? (
        <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <NumberInput autoFocus className="!w-32" placeholder="Bid ¢" value={bid} onChange={(e) => setBid(e.target.value)} aria-label="Bid" />
          <NumberInput className="!w-32" placeholder="Ask ¢" value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Ask" />
          <Button type="submit">Quote</Button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="max-h-40 overflow-y-auto text-sm">
            {res.fills.length === 0 ? <p className="text-muted">Nobody traded with you.</p> : res.fills.map((f, k) => (
              <div key={k} className="num flex justify-between border-b border-line py-1"><span>{f.trader === 'informed' ? 'Informed' : 'Noise'} trader {f.side === 'buy' ? 'bought from you' : 'sold to you'}</span><span>{f.price}¢</span></div>
            ))}
          </div>
          <Button onClick={next}>{i + 1 >= nR ? 'See results' : 'Next event'} <Kbd>Enter</Kbd></Button>
        </div>
      )}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
