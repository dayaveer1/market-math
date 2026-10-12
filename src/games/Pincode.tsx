'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@/lib/types';
import { mulberry32, pick } from '@/lib/rng';
import { expectedPin, genPin, nextPinLength, type PinMode } from '@/lib/engines/cognitive';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput } from '@/components/ui';

const LABEL: Record<PinMode, string> = { forward: 'in the order shown', reverse: 'in reverse order', sorted: 'sorted from smallest to largest' };

export default function Pincode({ settings, seed, onFinish, onMistake }: GameProps) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const modeSetting = String(settings.mode), trials = Number(settings.trials), flash = Number(settings.flashMs);
  const pickMode = (): PinMode => (modeSetting === 'mixed' ? pick(rng, ['forward', 'reverse', 'sorted'] as const) : (modeSetting as PinMode));
  const [len, setLen] = useState(Number(settings.startLength));
  const [streak, setStreak] = useState(0);
  const [i, setI] = useState(0);
  const [digits, setDigits] = useState(() => genPin(rng, Number(settings.startLength)));
  const [mode, setMode] = useState<PinMode>(pickMode);
  const [shown, setShown] = useState(-1); // index being flashed; digits.length = recall phase
  const [input, setInput] = useState('');
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const [waiting, setWaiting] = useState(false);
  const s = useRef({ correct: 0, digits: 0, maxLen: 0 });

  // Flash each digit for `flash` ms with a short blank between, so repeated digits are distinguishable.
  useEffect(() => {
    setShown(-1);
    const timers: number[] = [];
    digits.forEach((_, k) => {
      timers.push(window.setTimeout(() => setShown(k), 400 + k * (flash + 200)));
      timers.push(window.setTimeout(() => setShown(-1), 400 + k * (flash + 200) + flash));
    });
    timers.push(window.setTimeout(() => setShown(digits.length), 400 + digits.length * (flash + 200)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [digits, flash]);

  const recall = shown >= digits.length;
  const submit = () => {
    if (!recall || waiting) return;
    const exp = expectedPin(digits, mode);
    const ok = input.replace(/\D/g, '') === exp;
    if (ok) { s.current.correct++; s.current.digits += digits.length; s.current.maxLen = Math.max(s.current.maxLen, digits.length); }
    else onMistake({ prompt: `Digits ${digits.join(' ')}, ${LABEL[mode]}`, given: input || '(blank)', expected: exp });
    setFb({ ok, text: ok ? 'Correct' : `It was ${exp}` });
    const nx = nextPinLength(len, ok, streak);
    setLen(nx.len); setStreak(nx.errorStreak);
    if (i + 1 >= trials) {
      onFinish({ score: s.current.digits, correct: s.current.correct, total: trials, lines: [`Longest sequence recalled: ${s.current.maxLen}`, `${s.current.correct} of ${trials} correct`] });
      return;
    }
    setWaiting(true);
    window.setTimeout(() => { setI(i + 1); setMode(pickMode()); setDigits(genPin(rng, nx.len)); setInput(''); setWaiting(false); setFb({ ok: null, text: '' }); }, 900);
  };
  useKeys({ enter: () => submit() });

  return (
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <div className="num text-sm text-muted">Trial {i + 1} / {trials} · length {digits.length}</div>
      <p>Type the digits <span className="font-semibold">{LABEL[mode]}</span>.</p>
      <div className="num mx-auto flex h-32 w-32 items-center justify-center rounded-xl border border-line bg-surface text-7xl font-semibold" data-testid="stimulus">
        {shown >= 0 && shown < digits.length ? digits[shown] : ''}
      </div>
      {recall && !waiting && (
        <form className="mx-auto flex max-w-xs gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <NumberInput autoFocus inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Digits" />
          <Button type="submit">Enter <Kbd>↵</Kbd></Button>
        </form>
      )}
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
