'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { GAME_BY_ID } from '@/lib/registry';
import { useHydrated, useStore } from '@/lib/store';
import { Button, Panel } from '@/components/ui';

function Review() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const { mistakes, setReviewed, removeMistake } = useStore();
  const [game, setGame] = useState(params.get('game') ?? '');
  const [showReviewed, setShowReviewed] = useState(false);
  if (!hydrated) return null;
  const games = Array.from(new Set(mistakes.map((m) => m.gameId)));
  const list = mistakes.filter((m) => (!game || m.gameId === game) && (showReviewed || !m.reviewed)).slice().reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mistakes</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select className="rounded-md border border-line bg-surface px-2 py-1.5" value={game} onChange={(e) => setGame(e.target.value)} aria-label="Filter by drill">
          <option value="">All drills</option>
          {games.map((g) => <option key={g} value={g}>{GAME_BY_ID[g]?.name ?? g}</option>)}
        </select>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} /> Show reviewed</label>
        {game && <Link className="ml-auto text-accent hover:underline" href={`/play/${game}`}>Practise {GAME_BY_ID[game]?.name}</Link>}
      </div>
      {list.length === 0 ? (
        <Panel><p className="text-muted">{mistakes.length ? 'Nothing left to review here. Tick “Show reviewed” to see past items.' : 'Wrong answers from any drill are collected here so you can work through them later.'}</p></Panel>
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <Panel key={m.id} className={m.reviewed ? 'opacity-60' : ''}>
              <div className="mb-1 text-xs text-muted">{GAME_BY_ID[m.gameId]?.name} · {new Date(m.at).toLocaleString()}</div>
              <p className="num font-medium">{m.prompt}</p>
              <div className="num mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div>You: <span className="text-ask">{m.given}</span></div>
                <div>Expected: <span className="text-bid">{m.expected}</span></div>
              </div>
              {m.explanation && <p className="mt-2 text-sm text-muted">{m.explanation}</p>}
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => setReviewed(m.id, !m.reviewed)}>{m.reviewed ? 'Mark unreviewed' : 'Mark reviewed'}</Button>
                <Button variant="quiet" onClick={() => removeMistake(m.id)}>Delete</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
export default function Page() { return <Suspense><Review /></Suspense>; }
