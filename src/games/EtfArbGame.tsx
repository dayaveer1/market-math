'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as ETF from '@/lib/engines/etf';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, Stat, TimeBar } from '@/components/ui';

const MMS = ['Atlas', 'Birch', 'Corvo'];

export default function EtfArbGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const duration = Number(settings.duration), reaction = Number(settings.reaction), lot = Number(settings.lot), showNav = settings.showNav === true, tickMs = Number(settings.tickMs);
  const [basket, setBasket] = useState(() => ETF.newBasket(rng));
  const navNow = ETF.nav(basket);
  const [quotes, setQuotes] = useState<ETF.EtfQuote[]>(() => MMS.map((m) => ETF.makeQuote(rng, m, navNow, 0.15, 0.15, performance.now())));
  const [pnl, setPnl] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const stats = useRef({ good: 0, bad: 0, missed: 0, reactMs: [] as number[] });
  const done = useRef(false);
  const state = useRef({ basket, quotes, pnl });
  state.current = { basket, quotes, pnl };

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const s = stats.current;
    onFinish({ score: Math.round(state.current.pnl * 100) / 100, correct: s.good, total: s.good + s.bad, avgMs: s.reactMs.length ? s.reactMs.reduce((a, b) => a + b, 0) / s.reactMs.length : undefined, lines: [`${s.good} profitable trades, ${s.bad} losing trades`, `${s.missed} mispricings taken by rivals before you`] });
  }, [onFinish]);
  const left = useCountdown(duration, true, finish);

  // Market tick: move stocks, refresh quotes, rivals remove stale crossed quotes.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (done.current) return;
      const now = performance.now();
      const nb = ETF.stepBasket(rng, state.current.basket, 0.08);
      const n = ETF.nav(nb);
      setBasket(nb);
      setQuotes((qs) => qs.map((q) => {
        const crossed = ETF.isCrossed(q, n);
        if (crossed && q.crossedAt !== null && now - q.crossedAt > reaction) { stats.current.missed++; return ETF.makeQuote(rng, q.mm, n, 0.15, 0.12, now); }
        if (crossed) return { ...q, crossedAt: q.crossedAt ?? now };
        return rng() < 0.5 ? ETF.makeQuote(rng, q.mm, n, 0.15, 0.12, now) : { ...q, crossedAt: null };
      }));
    }, tickMs);
    return () => window.clearInterval(id);
  }, [rng, reaction, tickMs]);

  const trade = (k: number, side: 'buy' | 'sell') => {
    if (done.current) return;
    const q = state.current.quotes[k];
    const n = ETF.nav(state.current.basket);
    const price = side === 'buy' ? q.ask : q.bid;
    const p = ETF.tradePnl(side, price, n, lot);
    if (p > 0) { stats.current.good++; if (q.crossedAt) stats.current.reactMs.push(performance.now() - q.crossedAt); }
    else { stats.current.bad++; onMistake({ prompt: `NAV ${n.toFixed(2)}; ${q.mm} ${q.bid.toFixed(2)} / ${q.ask.toFixed(2)}`, given: `${side} at ${price.toFixed(2)}`, expected: q.bid > n ? 'sell to the bid' : q.ask < n ? 'buy the ask' : 'no trade' }); }
    setPnl((x) => Math.round((x + p) * 100) / 100);
    setFb({ ok: p > 0, text: `${side === 'buy' ? 'Bought' : 'Sold'} ${lot} from ${q.mm} at ${price.toFixed(2)} vs NAV ${n.toFixed(2)}: ${p >= 0 ? '+' : ''}${p.toFixed(2)}` });
    setQuotes((qs) => qs.map((x, j) => (j === k ? ETF.makeQuote(rng, x.mm, n, 0.15, 0.12, performance.now()) : x)));
  };
  useKeys({ '1': () => trade(0, 'buy'), '2': () => trade(1, 'buy'), '3': () => trade(2, 'buy'), q: () => trade(0, 'sell'), w: () => trade(1, 'sell'), e: () => trade(2, 'sell') });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="P&L" value={pnl.toFixed(2)} tone={pnl >= 0 ? 'bid' : 'ask'} />
        {showNav && <Stat label="NAV" value={navNow.toFixed(2)} />}
        <div className="w-full sm:w-64"><TimeBar leftMs={left} totalMs={duration * 1000} /></div>
      </div>
      <div>
        <div className="mb-2 text-sm text-muted">Basket per ETF unit</div>
        <table className="num w-full max-w-md text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Stock</th><th>Shares</th><th>Price</th><th>Value</th></tr></thead>
          <tbody>{basket.tickers.map((t, k) => (
            <tr key={t} className="border-t border-line"><td className="py-1">{t}</td><td>{basket.weights[k]}</td><td>{basket.prices[k].toFixed(2)}</td><td>{(basket.weights[k] * basket.prices[k]).toFixed(2)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-muted">ETF quotes</div>
        {quotes.map((q, k) => (
          <div key={q.mm} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3">
            <span className="w-20 font-medium">{q.mm}</span>
            <Button variant="outline" className="num text-bid" onClick={() => trade(k, 'sell')}>Sell {q.bid.toFixed(2)} <Kbd>{'QWE'[k]}</Kbd></Button>
            <Button variant="outline" className="num text-ask" onClick={() => trade(k, 'buy')}>Buy {q.ask.toFixed(2)} <Kbd>{k + 1}</Kbd></Button>
          </div>
        ))}
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
