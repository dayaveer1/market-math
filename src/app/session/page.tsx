'use client';
import { useState } from 'react';
import SessionRunner from '@/components/SessionRunner';
import { CATEGORY_LABEL, CATEGORY_ORDER, GAMES, GAME_BY_ID } from '@/lib/registry';
import type { PresetLevel } from '@/lib/types';
import type { SessionRecord } from '@/lib/store';
import { fmtScore } from '@/lib/stats';
import { Button, Panel } from '@/components/ui';

export default function CustomSession() {
  const [picked, setPicked] = useState<string[]>([]);
  const [level, setLevel] = useState<PresetLevel>('easy');
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Omit<SessionRecord, 'id'>[] | null>(null);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (summary) return (
    <Panel className="mx-auto max-w-lg space-y-4" >
      <h1 className="text-xl font-semibold">Session complete</h1>
      <table className="num w-full text-sm"><tbody>{summary.map((r, k) => (
        <tr key={k} className="border-t border-line"><td className="py-1.5">{GAME_BY_ID[r.gameId].name}</td><td className="text-right">{fmtScore(GAME_BY_ID[r.gameId], r.result.score)}</td><td className="text-right text-muted">{r.result.total ? `${Math.round(((r.result.correct ?? 0) / r.result.total) * 100)}%` : ''}</td></tr>
      ))}</tbody></table>
      <Button onClick={() => { setSummary(null); setRunning(false); }}>Build another session</Button>
    </Panel>
  );
  if (running) return <SessionRunner ids={picked} level={level} mode="custom-session" onDone={setSummary} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Custom session</h1>
        <p className="mt-1 text-muted">Pick drills in the order you want to play them. Each runs back to back at the same difficulty.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Difficulty</span>
        {(['easy', 'medium', 'hard'] as const).map((l) => <Button key={l} variant={level === l ? 'primary' : 'outline'} onClick={() => setLevel(l)} className="capitalize">{l}</Button>)}
        <Button className="ml-auto" disabled={!picked.length} onClick={() => setRunning(true)}>Start {picked.length || ''} drill{picked.length === 1 ? '' : 's'}</Button>
      </div>
      {CATEGORY_ORDER.map((c) => (
        <section key={c}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{CATEGORY_LABEL[c]}</h2>
          <div className="flex flex-wrap gap-2">
            {GAMES.filter((g) => g.category === c).map((g) => {
              const k = picked.indexOf(g.id);
              return (
                <button key={g.id} onClick={() => toggle(g.id)} aria-pressed={k >= 0} className={`rounded-md border px-3 py-2 text-sm ${k >= 0 ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-accent'}`}>
                  {k >= 0 && <span className="num mr-2 font-semibold text-accent">{k + 1}</span>}{g.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
