'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameMeta, GameResult, Mistake, PresetLevel, Settings } from '@/lib/types';
import { TIMING_KEYS } from '@/lib/registry';
import { useStore, useHydrated, type PlayMode, type SessionRecord } from '@/lib/store';
import { best, fmtScore, suggestLevel } from '@/lib/stats';
import { newSeed } from '@/lib/rng';
import { useKeys } from '@/hooks/useKeys';
import { GAME_COMPONENTS } from '@/games';
import SettingsForm from './SettingsForm';
import { Button, Kbd, Panel, Stat } from './ui';

export interface ShellProps {
  meta: GameMeta;
  /** Session/daily runners lock difficulty, seed and mode and skip the setup screen. */
  locked?: { difficulty: PresetLevel; seed?: number; mode: PlayMode; settings?: Settings };
  onComplete?: (rec: Omit<SessionRecord, 'id'>) => void;
  /** From a settings link (?s=…&autostart=1&seed=…): pre-filled custom settings, optional auto start and fixed seed. */
  initial?: { settings?: Settings; autostart?: boolean; seed?: number };
}

function applyMode(meta: GameMeta, s: Settings, mode: PlayMode): Settings {
  if (mode !== 'practice') return s;
  const out = { ...s };
  for (const def of meta.settings) if (def.type === 'number' && TIMING_KEYS.includes(def.key) && def.min === 0) out[def.key] = 0;
  return out;
}

export default function GameShell({ meta, locked, onComplete, initial }: ShellProps) {
  const hydrated = useHydrated();
  const { records, lastConfig, addRecord, addMistakes, setLastConfig } = useStore();
  const saved = lastConfig[meta.id];
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.settings ? 'custom' : locked?.difficulty ?? 'easy');
  const [settings, setSettings] = useState<Settings>({ ...meta.presets[locked?.difficulty ?? 'easy'], ...initial?.settings });
  const [mode, setMode] = useState<PlayMode>(locked?.mode ?? 'standard');
  const [phase, setPhase] = useState<'setup' | 'play' | 'results'>(locked || initial?.autostart ? 'play' : 'setup');
  const [seed, setSeed] = useState(() => locked?.seed ?? initial?.seed ?? newSeed());
  const [result, setResult] = useState<{ r: GameResult; prevBest: number | null; mistakes: number } | null>(null);
  const mistakes = useRef<Mistake[]>([]);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (hydrated && saved && !locked && !initial?.settings) { setDifficulty(saved.difficulty); setSettings({ ...meta.presets.easy, ...saved.settings }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const effective = useMemo(() => (locked?.settings ? locked.settings : mode === 'interview' ? meta.presets.hard : applyMode(meta, settings, mode)), [locked?.settings, meta, settings, mode]);
  const level: PresetLevel = mode === 'interview' ? 'hard' : difficulty === 'custom' ? 'easy' : difficulty;
  const recDifficulty: Difficulty = mode === 'interview' ? 'hard' : difficulty;
  const suggestion = hydrated && difficulty !== 'custom' ? suggestLevel(records, meta, difficulty as PresetLevel) : null;
  const Game = GAME_COMPONENTS[meta.id];

  const start = useCallback(() => {
    if (!locked) setLastConfig(meta.id, difficulty, settings);
    mistakes.current = [];
    startedAt.current = Date.now();
    setSeed(locked?.seed ?? initial?.seed ?? newSeed());
    setPhase('play');
  }, [difficulty, locked, meta.id, setLastConfig, settings]);

  const onFinish = useCallback((r: GameResult) => {
    const prevBest = best(useStore.getState().records, meta, recDifficulty);
    const rec: Omit<SessionRecord, 'id'> = { gameId: meta.id, difficulty: recDifficulty, mode, settings: effective, startedAt: startedAt.current, durationMs: Date.now() - startedAt.current, result: r };
    addRecord(rec);
    addMistakes(meta.id, mistakes.current);
    setResult({ r, prevBest, mistakes: mistakes.current.length });
    setPhase('results');
    onComplete?.(rec);
  }, [addMistakes, addRecord, effective, meta, mode, onComplete, recDifficulty]);

  const onMistake = useCallback((m: Mistake) => { mistakes.current.push(m); }, []);

  // While a game is being played, global header shortcuts (G, T) are suspended so they cannot interrupt it.
  useEffect(() => {
    if (phase !== 'play') return;
    document.body.dataset.playing = '1';
    return () => { delete document.body.dataset.playing; };
  }, [phase]);

  useKeys({
    enter: (e) => { if (phase === 'setup') { e.preventDefault(); start(); } else if (phase === 'results' && !locked) { e.preventDefault(); start(); } },
    r: () => { if (phase === 'results' && !locked) start(); },
    escape: () => { if (phase === 'play' && !locked) setPhase('setup'); else if (phase === 'results' && !locked) setPhase('setup'); },
  });

  if (phase === 'play') {
    return (
      <div>
        {!locked && (
          <div className="mb-6 flex items-center justify-between text-sm text-muted">
            <span>{meta.name} · {mode === 'interview' ? 'Interview' : mode === 'practice' ? 'Practice' : difficulty[0].toUpperCase() + difficulty.slice(1)}</span>
            <button className="hover:text-ink" onClick={() => setPhase('setup')}>Quit <Kbd>Esc</Kbd></button>
          </div>
        )}
        <Game key={seed} settings={effective} seed={seed} onFinish={onFinish} onMistake={onMistake} />
      </div>
    );
  }

  if (phase === 'results' && result) {
    const { r, prevBest, mistakes: nM } = result;
    const isBest = prevBest === null || (meta.higherIsBetter ? r.score > prevBest : r.score < prevBest);
    return (
      <Panel className="mx-auto max-w-xl" >
        <div data-testid="results">
          <h2 className="text-lg font-semibold">{meta.name}</h2>
          <p className="text-sm text-muted">{mode === 'interview' ? 'Interview' : mode === 'practice' ? 'Practice' : recDifficulty} session finished</p>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat label={meta.scoreLabel} value={<span data-testid="final-score">{fmtScore(meta, r.score)}</span>} tone={meta.scoreFormat === 'money' ? (r.score >= 0 ? 'bid' : 'ask') : undefined} />
            {r.total ? <Stat label="Accuracy" value={`${Math.round(((r.correct ?? 0) / r.total) * 100)}%`} /> : null}
            {r.avgMs ? <Stat label="Avg response" value={`${(r.avgMs / 1000).toFixed(2)}s`} /> : null}
            <Stat label={isBest ? 'New personal best' : 'Personal best'} value={prevBest === null || isBest ? fmtScore(meta, r.score) : fmtScore(meta, prevBest)} />
          </div>
          {r.lines?.length ? <ul className="mt-6 space-y-1 text-sm text-muted">{r.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
          {!locked && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={start}>Play again <Kbd>R</Kbd></Button>
              <Button variant="outline" onClick={() => setPhase('setup')}>Change settings</Button>
              {nM > 0 && <Link href={`/review?game=${meta.id}`} className="inline-flex items-center rounded-md px-4 py-2 text-sm text-accent hover:underline">Review {nM} mistake{nM > 1 ? 's' : ''}</Link>}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{meta.name}</h1>
          <p className="mt-1 max-w-prose text-muted">{meta.summary}</p>
        </div>
        <section>
          <h2 className="mb-2 font-semibold">How to play</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">{meta.howTo.map((h, i) => <li key={i}>{h}</li>)}</ol>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Controls</h2>
          <ul className="space-y-1 text-sm text-muted">{meta.controls.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
        <details className="rounded-md border border-line bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-medium">{meta.verification === 'rules-observed' ? 'Based on publicly posted rules; some details designed here' : 'Original design based on a short public description'}</summary>
          <p className="mt-2 text-muted">These mechanics have not been checked against the reference site:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">{meta.unverified.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </details>
      </div>
      <Panel className="h-fit space-y-5">
        <div>
          <div className="mb-2 text-sm font-medium">Mode</div>
          <div className="grid grid-cols-3 gap-1 rounded-md bg-paper p-1 text-sm" role="radiogroup">
            {(['standard', 'practice', 'interview'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`rounded px-2 py-1.5 capitalize ${mode === m ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}>{m}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {mode === 'practice' ? 'Practice removes optional timers. Real-time games stay timed.' : mode === 'interview' ? 'Interview locks the hardest settings.' : 'Pick a difficulty or tune every setting.'}
          </p>
        </div>
        {mode !== 'interview' && (
          <>
            <div>
              <div className="mb-2 text-sm font-medium">Difficulty</div>
              <div className="grid grid-cols-4 gap-1 rounded-md bg-paper p-1 text-sm">
                {(['easy', 'medium', 'hard', 'custom'] as const).map((d) => (
                  <button key={d} aria-pressed={difficulty === d} onClick={() => { setDifficulty(d); if (d !== 'custom') setSettings(meta.presets[d]); }} className={`rounded px-2 py-1.5 capitalize ${difficulty === d ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}>{d}</button>
                ))}
              </div>
              {suggestion && (
                <button className="mt-2 text-left text-xs text-accent hover:underline" onClick={() => { setDifficulty(suggestion.level); setSettings(meta.presets[suggestion.level]); }}>
                  Try {suggestion.level}: {suggestion.reason}
                </button>
              )}
            </div>
            <SettingsForm defs={meta.settings} value={settings} onChange={(s) => { setSettings(s); setDifficulty('custom'); }} />
          </>
        )}
        <Button className="w-full" onClick={start} data-testid="start">Start <Kbd>Enter</Kbd></Button>
        {hydrated && (
          <p className="text-xs text-muted">
            Best at {level}: {(() => { const b = best(records, meta, mode === 'interview' ? 'hard' : difficulty); return b === null ? 'no sessions yet' : fmtScore(meta, b); })()}
          </p>
        )}
      </Panel>
    </div>
  );
}
