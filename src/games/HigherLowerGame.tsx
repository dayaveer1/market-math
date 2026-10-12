'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32 } from '@/lib/rng';
import * as HL from '@/lib/engines/higherLower';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, Stat, TimeBar } from '@/components/ui';
import { PlayingCard } from './CardGame';

const FRACTIONS = [0, 0.1, 0.25, 0.5, 1];

export default function HigherLowerGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const calls = Number(settings.cards), start = Number(settings.bankroll), showProb = settings.showProb === true, dt = Number(settings.decisionTime);
  const [deck, setDeck] = useState(() => HL.newDeck(rng));
  const [current, setCurrent] = useState(() => deck[0]);
  const [pos, setPos] = useState(1);
  const [bank, setBank] = useState(start);
  const [stake, setStake] = useState('');
  const [n, setN] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const stats = useRef({ rightSide: 0, ms: [] as number[], sizingErr: [] as number[] });
  const t0 = useRef(performance.now());

  const remaining = deck.slice(pos);
  const pH = HL.probHigher(current, remaining), pL = HL.probLower(current, remaining);

  const finish = (b: number, made: number) => onFinish({
    score: Math.round(b * 100) / 100, correct: stats.current.rightSide, total: made,
    avgMs: stats.current.ms.length ? stats.current.ms.reduce((a, c) => a + c, 0) / stats.current.ms.length : undefined,
    lines: [`${stats.current.rightSide} of ${made} calls on the more likely side`, `Average |stake − Kelly| ${(stats.current.sizingErr.reduce((a, c) => a + c, 0) / Math.max(1, stats.current.sizingErr.length) * 100).toFixed(1)}% of bankroll`, ...(b <= 0 ? ['Busted'] : [])],
  });

  const call = (dir: 'higher' | 'lower', stakeOverride?: number) => {
    const s = stakeOverride ?? Math.floor(Number(stake) || 0);
    if (s < 0 || s > bank) { setFb({ ok: false, text: `Stake must be between 0 and ${bank}.` }); return; }
    const p = dir === 'higher' ? pH : pL;
    const better = pH >= pL ? 'higher' : 'lower';
    const kelly = HL.kellyEvenMoney(Math.max(pH, pL));
    stats.current.ms.push(performance.now() - t0.current);
    stats.current.sizingErr.push(Math.abs(s / bank - (dir === better ? kelly : 0)));
    if (dir === better) stats.current.rightSide++;
    else onMistake({ prompt: `Card ${current} with ${remaining.length} cards left`, given: `${dir} (p = ${p.toFixed(3)})`, expected: `${better} (p = ${Math.max(pH, pL).toFixed(3)})` });
    const next = deck[pos];
    const delta = HL.settleBet(dir, current, next, s);
    const nb = bank + delta;
    setFb({ ok: delta > 0 || s === 0 ? delta >= 0 : false, text: `Next card ${next}. ${delta >= 0 ? 'Won' : 'Lost'} ${Math.abs(delta)}. Kelly stake was ${Math.round(kelly * bank)}.` });
    setLast(current);
    setBank(nb);
    const made = n + 1;
    setN(made);
    if (nb <= 0 || made >= calls) { finish(nb, made); return; }
    let d = deck, np = pos + 1;
    if (d.length - np < 6) { d = HL.newDeck(rng); np = 1; setDeck(d); setCurrent(d[0]); } else setCurrent(next);
    setPos(np);
    t0.current = performance.now();
  };
  const left = useCountdown(dt, true, () => call(pH >= pL ? 'higher' : 'lower', 0), n);
  useKeys({ h: () => call('higher'), l: () => call('lower'), ...Object.fromEntries(FRACTIONS.map((f, i) => [String(i + 1), () => setStake(String(Math.floor(bank * f)))])) });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Call" value={`${n + 1} / ${calls}`} />
        <Stat label="Bankroll" value={bank.toLocaleString()} tone={bank >= start ? 'bid' : 'ask'} />
        <Stat label="Cards left in deck" value={remaining.length} />
        <div className="w-full sm:w-56"><TimeBar leftMs={left} totalMs={dt * 1000} /></div>
      </div>
      <div className="flex items-center gap-6">
        <PlayingCard rank={current} />
        {last !== null && <span className="text-sm text-muted">previous: {last}</span>}
        {showProb && <div className="num text-sm">P(higher) {pH.toFixed(3)} · P(lower) {pL.toFixed(3)} · Kelly {(HL.kellyEvenMoney(Math.max(pH, pL)) * 100).toFixed(1)}%</div>}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {FRACTIONS.map((f, i) => <Button key={f} variant="outline" onClick={() => setStake(String(Math.floor(bank * f)))}>{f * 100}% <Kbd>{i + 1}</Kbd></Button>)}
        </div>
        <NumberInput placeholder="Stake" value={stake} onChange={(e) => setStake(e.target.value)} aria-label="Stake"
          onKeyDown={(e) => { const k = e.key.toLowerCase(); if (k === 'h' || k === 'l') { e.preventDefault(); call(k === 'h' ? 'higher' : 'lower'); } }} />
        <div className="flex gap-3">
          <Button variant="bid" onClick={() => call('higher')}>Higher <Kbd>H</Kbd></Button>
          <Button variant="ask" onClick={() => call('lower')}>Lower <Kbd>L</Kbd></Button>
        </div>
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
