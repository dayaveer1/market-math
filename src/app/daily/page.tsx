'use client';
import { useMemo, useState } from 'react';
import { GAME_BY_ID } from '@/lib/registry';
import { dateKey } from '@/lib/rng';
import { dailyPlan } from '@/lib/daily';
import { useHydrated, useStore, type SessionRecord } from '@/lib/store';
import { fmtScore } from '@/lib/stats';
import { Button, Panel } from '@/components/ui';
import SessionRunner from '@/components/SessionRunner';

export default function Daily() {
  const hydrated = useHydrated();
  const records = useStore((s) => s.records);
  // Computed only on the client: the page is prerendered at build time, when the date would be wrong.
  const plan = useMemo(() => (hydrated ? dailyPlan() : null), [hydrated]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Omit<SessionRecord, 'id'>[] | null>(null);
  const today = dateKey();
  const todays = hydrated ? records.filter((r) => r.mode === 'daily' && dateKey(new Date(r.startedAt)) === today) : [];

  if (!plan) return null;
  if (running && !done) return <SessionRunner ids={plan.ids} seeds={plan.seeds} level="medium" mode="daily" onDone={setDone} />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily challenge · {today}</h1>
        <p className="mt-1 text-muted">Three drills at medium difficulty with fixed seeds, so every attempt today sees the same questions. A new set appears at midnight.</p>
      </div>
      <Panel>
        <ol className="space-y-2">
          {plan.ids.map((id, k) => {
            const r = todays.filter((x) => x.gameId === id).at(-1);
            return (
              <li key={id} className="flex justify-between">
                <span><span className="num mr-3 text-muted">{k + 1}</span>{GAME_BY_ID[id].name}</span>
                <span className="num text-sm">{r ? fmtScore(GAME_BY_ID[id], r.result.score) : <span className="text-muted">not played</span>}</span>
              </li>
            );
          })}
        </ol>
        <Button className="mt-6" onClick={() => { setDone(null); setRunning(true); }}>{todays.length ? 'Play again' : 'Start today’s challenge'}</Button>
      </Panel>
    </div>
  );
}
