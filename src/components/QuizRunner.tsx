'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mulberry32 } from '@/lib/rng';
import { parseAnswer, withinTolerance, fmtNum } from '@/lib/parse';
import type { GameProps, Question, QuestionGenerator } from '@/lib/types';
import { adaptStep, initAdapt, type Lvl } from '@/lib/adaptive';
import { FAMILIES } from '@/lib/engines/families';
import { useCountdown } from '@/hooks/useCountdown';
import { useKeys } from '@/hooks/useKeys';
import { Button, Feedback, Kbd, NumberInput, TimeBar } from './ui';

interface Props extends GameProps {
  generate: QuestionGenerator;
  /** 'count': score = correct (− wrong with negative marking). 'points': score = Σ credit × 100. */
  scoring?: 'count' | 'points';
  /** Answer time (ms) that counts as "fast" for adaptive step-ups. */
  fastMs?: number;
}

/**
 * Shared engine for every question-and-answer activity: trainers, drills and timed assessments.
 * Timed or untimed, fixed length or open-ended (Finish button), typed / numeric choice / text options,
 * optional skip, negative marking, per-topic breakdown and in-session adaptive level.
 */
export default function QuizRunner({ settings, seed, onFinish, onMistake, generate, scoring = 'count', fastMs = 15000 }: Props) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const duration = Number(settings.duration ?? 0);
  const limit = Number(settings.questions ?? 0);
  const endless = duration <= 0 && limit <= 0;
  const perQ = Number(settings.perQuestion ?? 0);
  const negative = settings.negativeMarking === true;
  const allowSkip = settings.allowSkip === true;
  const adaptive = settings.adaptive === true;

  const [adapt, setAdapt] = useState(() => initAdapt((String(settings.level ?? 'easy') as Lvl)));
  const gen = useCallback((i: number, level: Lvl) => generate(rng, { ...settings, level }, i), [generate, rng, settings]);
  const [index, setIndex] = useState(0);
  const [q, setQ] = useState<Question>(() => gen(0, adapt.level));
  const [input, setInput] = useState('');
  const [fb, setFb] = useState<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  const [done, setDone] = useState(false);
  const stats = useRef({ correct: 0, wrong: 0, skipped: 0, points: 0, ms: [] as number[], fam: {} as Record<string, { c: number; n: number }>, maxLevel: adapt.level });
  const qStart = useRef(performance.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback(() => {
    if (done) return;
    setDone(true);
    const s = stats.current;
    const total = s.correct + s.wrong + s.skipped;
    const score = scoring === 'points' ? Math.round(s.points) : s.correct - (negative ? s.wrong : 0);
    const famLines = Object.entries(s.fam).map(([k, v]) => `${FAMILIES[k]?.label ?? k}: ${v.c}/${v.n}`);
    onFinish({
      score, correct: s.correct, total,
      avgMs: s.ms.length ? s.ms.reduce((a, b) => a + b, 0) / s.ms.length : undefined,
      lines: [
        `${s.correct} of ${total} correct${s.skipped ? `, ${s.skipped} skipped` : ''}`,
        ...(negative ? [`${s.wrong} wrong (−1 each)`] : []),
        ...(adaptive ? [`Adaptive level reached: ${s.maxLevel}`] : []),
        ...(famLines.length > 1 ? [`By topic: ${famLines.join(' · ')}`] : []),
      ],
    });
  }, [adaptive, done, negative, onFinish, scoring]);

  const totalLeft = useCountdown(duration, !done, finish);

  const advance = useCallback((level: Lvl) => {
    const next = index + 1;
    if (limit > 0 && next >= limit) { finish(); return; }
    setIndex(next);
    setQ(gen(next, level));
    setInput('');
    qStart.current = performance.now();
    inputRef.current?.focus();
  }, [finish, gen, index, limit]);

  const record = (fam: string | undefined, ok: boolean) => {
    if (!fam) return;
    const f = (stats.current.fam[fam] ??= { c: 0, n: 0 });
    f.n++; if (ok) f.c++;
  };

  const grade = useCallback((raw: string, value: number | null) => {
    if (done) return;
    const ms = performance.now() - qStart.current;
    let credit = 0;
    if (value !== null) {
      if (q.options) credit = value === q.answer ? 1 : 0;
      else credit = q.credit ? q.credit(value) : withinTolerance(value, q.answer, q.tolerance) ? 1 : 0;
    }
    const ok = q.credit ? credit >= 0.5 : credit === 1;
    const s = stats.current;
    s.ms.push(ms);
    s.points += credit * 100;
    if (ok) s.correct++; else s.wrong++;
    record(q.family, ok);
    if (!ok) onMistake({ prompt: q.detail ? `${q.prompt} (${q.detail})` : q.prompt, given: raw || '(no answer)', expected: q.display, explanation: q.explanation });
    const extra = q.credit ? ` (+${Math.round(credit * 100)})` : '';
    setFb({ ok, text: ok ? `Correct${extra}${q.credit || q.explanation ? ` — ${q.display}` : ''}` : `${raw ? 'Not quite' : 'Time'} — answer ${q.display}${extra}${q.explanation ? `. ${q.explanation}` : ''}` });
    let level = adapt.level;
    if (adaptive) {
      const na = adaptStep(adapt, ok, ms, fastMs);
      if (na.level !== adapt.level) setFb((f) => ({ ...f, text: `${f.text} Level → ${na.level}.` }));
      if (['easy', 'medium', 'hard'].indexOf(na.level) > ['easy', 'medium', 'hard'].indexOf(s.maxLevel)) s.maxLevel = na.level;
      setAdapt(na);
      level = na.level;
    }
    advance(level);
  }, [adapt, adaptive, advance, done, fastMs, onMistake, q]);

  const skip = useCallback(() => {
    if (done || !allowSkip) return;
    stats.current.skipped++;
    record(q.family, false);
    setFb({ ok: null, text: '' });
    advance(adapt.level);
  }, [adapt.level, advance, allowSkip, done, q.family]);

  const perLeft = useCountdown(perQ, !done, () => grade('', null), index);

  const submitTyped = () => {
    const raw = input.trim();
    if (!raw) return;
    const v = parseAnswer(q.unit === '%' ? raw.replace(/%$/, '') : raw);
    if (v === null) { setFb({ ok: false, text: 'Enter a number, e.g. 12, 0.375, 3/8, 2.5k' }); return; }
    grade(raw, v);
  };

  const nOpts = q.options?.length ?? q.choices?.length ?? 0;
  useKeys({
    ...Object.fromEntries(Array.from({ length: nOpts }, (_, i) => [String(i + 1), () => (q.options ? grade(q.options[i], i) : q.choices && grade(fmtNum(q.choices[i], 4), q.choices[i]))])),
    s: () => skip(),
  });

  // Test hook for automated browser tests: dev server, or a static build made with NEXT_PUBLIC_E2E=1. Never in the public site.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_E2E === '1') (window as unknown as { __fw: unknown }).__fw = { answer: q.display, value: q.answer, isOption: !!q.options };
  }, [q]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6" data-testid="quiz">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="num">Question {index + 1}{limit > 0 ? ` of ${limit}` : ''}{q.family && FAMILIES[q.family] ? ` · ${FAMILIES[q.family].label}` : ''}{adaptive ? ` · level ${adapt.level}` : ''}</span>
        <span className="num">{stats.current.correct} correct</span>
      </div>
      {totalLeft !== null && <TimeBar leftMs={totalLeft} totalMs={duration * 1000} />}
      <div className="py-4">
        <p className="num text-2xl font-semibold leading-snug sm:text-3xl" data-testid="prompt">{q.prompt}</p>
        {q.detail && <p className="num mt-3 text-lg text-muted">{q.detail}</p>}
      </div>
      {perLeft !== null && <TimeBar leftMs={perLeft} totalMs={perQ * 1000} />}
      {q.options ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o, i) => (
            <Button key={i} variant="outline" className="justify-start py-4 text-left text-lg" onClick={() => grade(o, i)}><Kbd>{i + 1}</Kbd> {o}</Button>
          ))}
        </div>
      ) : q.choices ? (
        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => (
            <Button key={i} variant="outline" className="num justify-start py-4 text-lg" onClick={() => grade(fmtNum(c, 4), c)}>
              <Kbd>{i + 1}</Kbd> {fmtNum(c, 4)}{q.unit === '%' ? '%' : ''}
            </Button>
          ))}
        </div>
      ) : (
        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); submitTyped(); }}>
          <NumberInput ref={inputRef} autoFocus value={input} onChange={(e) => setInput(e.target.value)} aria-label="Your answer" data-testid="answer-input" placeholder={q.unit === '%' ? 'Answer in %' : 'Your answer'} />
          <Button type="submit">Submit</Button>
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        {allowSkip && <Button variant="quiet" onClick={skip}>Skip <Kbd>S</Kbd></Button>}
        {endless && <Button variant="outline" onClick={finish} data-testid="finish">Finish session</Button>}
      </div>
      <Feedback ok={fb.ok}>{fb.text}</Feedback>
    </div>
  );
}
