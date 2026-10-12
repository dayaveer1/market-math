'use client';
import { useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, shuffle } from '@/lib/rng';
import { FERMI_BANK, scoreInterval } from '@/lib/engines/fermi';
import { fmtNum, parseAnswer } from '@/lib/parse';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, Stat, TimeBar } from '@/components/ui';

export default function FermiGame({ settings, seed, onFinish, onMistake }: GameProps) {
  const nQ = Number(settings.questions), dt = Number(settings.decisionTime);
  const order = useMemo(() => shuffle(mulberry32(seed), FERMI_BANK), [seed]);
  const [i, setI] = useState(0);
  const [lo, setLo] = useState('');
  const [hi, setHi] = useState('');
  const [answered, setAnswered] = useState(false);
  const [total, setTotal] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const hits = useRef(0);
  const ms = useRef<number[]>([]);
  const t0 = useRef(performance.now());
  const item = order[i % order.length];

  const submit = (timeout = false) => {
    if (answered) return;
    const l = parseAnswer(lo), h = parseAnswer(hi);
    if (!timeout && (l === null || h === null)) { setFb({ ok: false, text: 'Enter a low and a high number.' }); return; }
    const frac = left === null ? 1 : left / (dt * 1000);
    const s = timeout || l === null || h === null ? { valid: true, hit: false, points: 0, precision: 0 } : scoreInterval(l, h, item.answer, frac);
    if (!s.valid) { setFb({ ok: false, text: 'Low must be positive and no greater than high.' }); return; }
    ms.current.push(performance.now() - t0.current);
    if (s.hit) hits.current++;
    else onMistake({ prompt: item.q, given: timeout ? '(no answer)' : `${lo} – ${hi}`, expected: `${fmtNum(item.answer, 2)} ${item.unit}`, explanation: item.note });
    setTotal((t) => t + s.points);
    setAnswered(true);
    setFb({ ok: s.hit, text: `${s.hit ? `Hit, +${s.points}` : 'Miss'} — answer ${fmtNum(item.answer, 2)} ${item.unit} (${item.note})` });
  };
  const next = () => {
    if (i + 1 >= nQ) {
      onFinish({ score: total, correct: hits.current, total: nQ, avgMs: ms.current.reduce((a, b) => a + b, 0) / ms.current.length, lines: [`${hits.current} of ${nQ} ranges contained the answer`] });
      return;
    }
    setI(i + 1); setLo(''); setHi(''); setAnswered(false); setFb({ ok: null, text: '' }); t0.current = performance.now();
  };
  const left = useCountdown(dt, !answered, () => submit(true), i);
  useKeys({ enter: () => answered && next() });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat label="Question" value={`${i + 1} / ${nQ}`} />
        <Stat label="Points" value={total} />
        <div className="w-full sm:w-64"><TimeBar leftMs={left} totalMs={dt * 1000} /></div>
      </div>
      <p className="text-2xl font-semibold leading-snug">{item.q}</p>
      {!answered ? (
        <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <NumberInput autoFocus className="!w-40" placeholder="Low" value={lo} onChange={(e) => setLo(e.target.value)} aria-label="Low estimate" />
          <NumberInput className="!w-40" placeholder="High" value={hi} onChange={(e) => setHi(e.target.value)} aria-label="High estimate" />
          <Button type="submit">Submit</Button>
        </form>
      ) : (
        <Button onClick={next}>{i + 1 >= nQ ? 'See results' : 'Next question'} <Kbd>Enter</Kbd></Button>
      )}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
