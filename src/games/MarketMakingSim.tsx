'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as M from '@/lib/engines/mmSim';
import { useKeys } from '@/hooks/useKeys';
import { Button, Kbd, Stat } from '@/components/ui';

function Spark({ xs }: { xs: number[] }) {
  if (xs.length < 2) return <svg className="h-12 w-full" />;
  const lo = Math.min(...xs, 0), hi = Math.max(...xs, 0), span = hi - lo || 1;
  const pts = xs.map((x, i) => `${(i / (xs.length - 1)) * 300},${48 - ((x - lo) / span) * 44 - 2}`).join(' ');
  const zero = 48 - ((0 - lo) / span) * 44 - 2;
  return (
    <svg viewBox="0 0 300 48" className="h-12 w-full" preserveAspectRatio="none" aria-label="P&L path">
      <line x1={0} x2={300} y1={zero} y2={zero} className="stroke-line" strokeDasharray="3 3" />
      <polyline points={pts} className={`fill-none ${xs[xs.length - 1] >= 0 ? 'stroke-bid' : 'stroke-ask'}`} strokeWidth={1.5} />
    </svg>
  );
}

/** Interactive market-making simulator for one instrument (ETF, option, future or prediction contract). */
export default function MarketMakingSim({ settings, seed, onFinish, onMistake, instrumentId }: GameProps & { instrumentId: string }) {
  const inst = M.INSTRUMENTS[instrumentId];
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const P: M.SimParams = useMemo(() => ({
    ticks: Number(settings.ticks), traders: Number(settings.traders), informedPct: Number(settings.informedPct), maxPos: Number(settings.maxPos),
    lot: 1, hedgeCost: Number(settings.hedgeCost ?? 0), vol: Number(settings.vol), newsPct: Number(settings.newsPct),
  }), [settings]);
  const tickMs = Number(settings.tickMs);
  const showFair = settings.showFair === true;
  const [st, setSt] = useState(() => M.initSim(rng, inst, P));
  const fair0 = inst.fair(st.inst);
  const step = inst.priceTick;
  const snap = (x: number) => Math.round(x / step) * step;
  const [mid, setMid] = useState(() => snap(fair0 + (showFair ? 0 : (rng() - 0.5) * 6 * inst.spreadScale)));
  const [half, setHalf] = useState(() => snap(inst.spreadScale) || step);
  const [quoting, setQuoting] = useState(true);
  const [paused, setPaused] = useState(false);
  const stRef = useRef(st); stRef.current = st;
  const qRef = useRef<M.Quote | null>(null);
  qRef.current = quoting ? { bid: snap(mid - half), ask: snap(mid + half) } : null;
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const s = M.summary(inst, stRef.current);
    const badInformed = stRef.current.fills.filter((f) => f.informed);
    if (badInformed.length > s.fills / 2 && s.fills > 4) onMistake({ prompt: `${inst.name}: ${s.fills} fills, ${badInformed.length} against informed traders`, given: 'quotes too often on the wrong side of fair', expected: 'keep your quote centred on fair value and widen when news arrives', explanation: 'Informed flow only hits quotes that are stale relative to the next fair value.' });
    onFinish({
      score: Math.round(s.pnl * 100) / 100,
      lines: [
        `Settled P&L ${s.pnl.toFixed(2)} from ${s.fills} fills (${s.informedFills} against informed traders)`,
        `Edge captured at fill ${s.edgeCaptured.toFixed(2)} · one-tick markout vs informed ${s.informedMarkout.toFixed(2)}`,
        `Max |position| ${s.maxAbsPos} · average |net delta| ${s.avgAbsDelta.toFixed(2)} · hedging costs ${s.hedgeCost.toFixed(2)}`,
        ...(inst.id === 'prediction' ? [`Event resolved ${stRef.current.inst.outcome ? 'YES' : 'NO'}; final fair was ${inst.fair(stRef.current.inst).toFixed(1)}`] : []),
      ],
    });
  }, [inst, onFinish, onMistake]);

  const advance = useCallback(() => {
    if (done.current) return;
    const ns = M.simTick(rng, inst, stRef.current, qRef.current, P);
    stRef.current = ns;
    setSt(ns);
    if (ns.inst.t >= P.ticks) finish();
  }, [P, finish, inst, rng]);

  useEffect(() => {
    if (tickMs <= 0 || paused) return;
    const id = window.setInterval(advance, tickMs);
    return () => window.clearInterval(id);
  }, [advance, paused, tickMs]);

  const hedge = () => { const ns = M.hedgeAll(inst, stRef.current, P); stRef.current = ns; setSt(ns); };
  useKeys({
    arrowup: (e) => { e.preventDefault(); setMid((m) => snap(m + step)); }, arrowdown: (e) => { e.preventDefault(); setMid((m) => snap(m - step)); },
    arrowright: (e) => { e.preventDefault(); setHalf((h) => snap(h + step)); }, arrowleft: (e) => { e.preventDefault(); setHalf((h) => Math.max(step, snap(h - step))); },
    pageup: () => setMid((m) => snap(m + step * 10)), pagedown: () => setMid((m) => snap(m - step * 10)),
    h: hedge, q: () => setQuoting((x) => !x), p: () => tickMs > 0 && setPaused((x) => !x), n: () => (tickMs <= 0 || paused) && advance(), f: finish,
  });

  const fair = inst.fair(st.inst);
  const delta = M.netDelta(inst, st);
  const mtm = M.markToMarket(inst, st);
  const dp = step >= 1 ? 0 : 2;
  const lastFills = st.fills.slice(-8).reverse();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Tick" value={`${st.inst.t} / ${P.ticks}`} />
        <Stat label="Position" value={st.pos} />
        {inst.hedgeName !== '—' && <Stat label={`Hedge (${inst.hedgeName})`} value={st.hedgePos} />}
        {inst.hedgeName !== '—' && <Stat label="Net delta" value={delta.toFixed(2)} tone={Math.abs(delta) > P.maxPos / 2 ? 'ask' : undefined} />}
        <Stat label="P&L (marked)" value={mtm.toFixed(2)} tone={mtm >= 0 ? 'bid' : 'ask'} />
        {showFair && <Stat label="Fair value" value={fair.toFixed(dp)} />}
      </div>
      <Spark xs={st.pnlPath} />
      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div className="text-sm font-medium">{inst.name}</div>
          <table className="num w-full text-sm"><tbody>{inst.info(st.inst).map((r) => (
            <tr key={r.label} className="border-t border-line"><td className="py-1 text-muted">{r.label}</td><td className="text-right">{r.value}</td></tr>
          ))}</tbody></table>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-sm" aria-live="polite">{st.log.slice(0, 6).map((l, i) => <li key={i} className={i === 0 ? 'font-medium' : 'text-muted'}>{l}</li>)}</ul>
        </div>
        <div className="space-y-3">
          <div className="text-sm font-medium">Your quote {quoting ? '' : '(pulled)'}</div>
          <div className="num flex items-center gap-4 text-3xl font-semibold" data-testid="quote">
            <span className="text-bid">{(mid - half).toFixed(dp)}</span><span className="text-base text-muted">/</span><span className="text-ask">{(mid + half).toFixed(dp)}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" onClick={() => setMid((m) => snap(m - step))}>Mid − <Kbd>↓</Kbd></Button>
            <Button variant="outline" onClick={() => setMid((m) => snap(m + step))}>Mid + <Kbd>↑</Kbd></Button>
            <Button variant="outline" onClick={() => setHalf((h) => Math.max(step, snap(h - step)))}>Tighter <Kbd>←</Kbd></Button>
            <Button variant="outline" onClick={() => setHalf((h) => snap(h + step))}>Wider <Kbd>→</Kbd></Button>
            <Button variant="outline" onClick={() => setQuoting((x) => !x)}>{quoting ? 'Pull quote' : 'Quote again'} <Kbd>Q</Kbd></Button>
            {inst.hedgeName !== '—' && <Button variant="outline" onClick={hedge}>Hedge delta <Kbd>H</Kbd></Button>}
            {tickMs > 0 ? <Button variant="quiet" onClick={() => setPaused((x) => !x)}>{paused ? 'Resume' : 'Pause'} <Kbd>P</Kbd></Button> : <Button onClick={advance}>Next tick <Kbd>N</Kbd></Button>}
            {paused && <Button onClick={advance}>Step <Kbd>N</Kbd></Button>}
            <Button variant="quiet" onClick={finish}>End session <Kbd>F</Kbd></Button>
          </div>
          <p className="text-xs text-muted">Position limit ±{P.maxPos}. Fills beyond it are refused. PageUp/PageDown move the mid 10 ticks.</p>
          <div>
            <div className="mb-1 text-xs text-muted">Recent fills</div>
            <table className="num w-full text-xs"><tbody>{lastFills.map((f, i) => (
              <tr key={i} className="border-t border-line"><td className="py-0.5">t{f.t}</td><td className={f.side === 'buy' ? 'text-bid' : 'text-ask'}>{f.side === 'buy' ? 'You bought' : 'You sold'}</td><td>{f.price.toFixed(dp)}</td><td className="text-muted">{f.informed ? 'informed' : 'noise'}</td><td className={(f.markout ?? 0) >= 0 ? 'text-bid' : 'text-ask'}>{(f.markout ?? 0).toFixed(2)}</td></tr>
            ))}</tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
