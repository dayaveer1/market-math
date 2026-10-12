'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useKeys } from '@/hooks/useKeys';
import GameShell from '@/components/GameShell';
import { GAME_BY_ID } from '@/lib/registry';
import type { PresetLevel, Settings } from '@/lib/types';
import type { SessionRecord } from '@/lib/store';
import { fmtScore } from '@/lib/stats';
import { Button, Kbd, Panel } from '@/components/ui';

/** Continue button that ignores keypresses for 400 ms, so the Enter that ended a drill cannot skip this screen. */
function ContinueButton({ label, onGo }: { label: string; onGo: () => void }) {
  const t0 = useRef(0);
  useEffect(() => { t0.current = performance.now(); }, []);
  useKeys({ enter: (e) => { if (performance.now() - t0.current > 400) { e.preventDefault(); onGo(); } } });
  return <Button onClick={onGo}>{label} <Kbd>Enter</Kbd></Button>;
}

/** Plays a list of drills back to back with locked difficulty (custom sessions and daily challenges). */
export default function SessionRunner({ ids, level, mode, seeds, settingsFor, header, onDone }: { ids: string[]; level: PresetLevel; mode: 'custom-session' | 'daily' | 'interview'; seeds?: number[]; settingsFor?: (i: number) => Settings; header?: ReactNode; onDone: (r: Omit<SessionRecord, 'id'>[]) => void }) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Omit<SessionRecord, 'id'>[]>([]);
  const [between, setBetween] = useState(false);
  const meta = GAME_BY_ID[ids[i]];
  if (between) {
    const last = results[results.length - 1];
    return (
      <Panel className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-sm text-muted">Drill {i + 1} of {ids.length} done</p>
        <p className="text-lg font-semibold">{GAME_BY_ID[last.gameId].name}: {fmtScore(GAME_BY_ID[last.gameId], last.result.score)}</p>
        <ContinueButton label={`Next: ${GAME_BY_ID[ids[i + 1]].name}`} onGo={() => { setBetween(false); setI(i + 1); }} />
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      {header}
      <div className="text-sm text-muted">Drill {i + 1} of {ids.length}: <span className="font-medium text-ink">{meta.name}</span></div>
      <GameShell key={`${ids[i]}-${i}`} meta={meta} locked={{ difficulty: level, mode, seed: seeds?.[i], settings: settingsFor?.(i) }}
        onComplete={(rec) => { const all = [...results, rec]; setResults(all); if (i + 1 >= ids.length) onDone(all); else setBetween(true); }} />
    </div>
  );
}

