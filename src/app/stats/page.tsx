'use client';
import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_LABEL, CATEGORY_ORDER, GAMES, GAME_BY_ID } from '@/lib/registry';
import { useHydrated, useStore } from '@/lib/store';
import { accuracy, avgResponseMs, best, dailySeries, fmtScore } from '@/lib/stats';
import { Button, Panel, Stat } from '@/components/ui';

export default function StatsPage() {
  const hydrated = useHydrated();
  const { records, mistakes, resetAll, importData } = useStore();
  const played = useMemo(() => GAMES.filter((g) => records.some((r) => r.gameId === g.id)), [records]);
  const [gameId, setGameId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!hydrated) return null;
  const sel = GAME_BY_ID[gameId] ?? played[0];
  const byCat = CATEGORY_ORDER.map((c) => {
    const rs = records.filter((r) => GAME_BY_ID[r.gameId]?.category === c);
    const a = accuracy(rs);
    return { name: CATEGORY_LABEL[c], accuracy: a === null ? 0 : Math.round(a * 100), sessions: rs.length };
  });
  const totalMin = Math.round(records.reduce((s, r) => s + r.durationMs, 0) / 60000);
  const acc = accuracy(records), rt = avgResponseMs(records);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ records, mistakes, lastConfig: useStore.getState().lastConfig }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `floorwork-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Sessions" value={records.length} />
        <Stat label="Minutes practised" value={totalMin} />
        <Stat label="Overall accuracy" value={acc === null ? '—' : `${Math.round(acc * 100)}%`} />
        <Stat label="Average response" value={rt === null ? '—' : `${(rt / 1000).toFixed(2)}s`} />
      </div>
      {records.length === 0 ? (
        <Panel><p className="text-muted">Finish a session in any drill and your scores, accuracy and response times will chart here.</p></Panel>
      ) : (
        <>
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Score history</h2>
              <select className="rounded-md border border-line bg-paper px-2 py-1 text-sm" value={sel?.id} onChange={(e) => setGameId(e.target.value)} aria-label="Game">
                {played.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {sel && (
              <>
                <p className="mb-3 text-sm text-muted">Best {fmtScore(sel, best(records, sel)!)} · {records.filter((r) => r.gameId === sel.id).length} sessions</p>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={dailySeries(records, sel.id)}>
                      <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
                      <XAxis dataKey="n" stroke="rgb(var(--muted))" fontSize={12} />
                      <YAxis stroke="rgb(var(--muted))" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }} />
                      <Line type="monotone" dataKey="score" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name={sel.scoreLabel} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Panel>
          <Panel>
            <h2 className="mb-4 font-semibold">Accuracy by category</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byCat}>
                  <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="rgb(var(--muted))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="rgb(var(--muted))" fontSize={12} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }} />
                  <Bar dataKey="accuracy" fill="rgb(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold">Recent sessions</h2>
            <div className="overflow-x-auto">
              <table className="num w-full text-left text-sm">
                <thead className="text-xs text-muted"><tr><th className="py-1">When</th><th>Drill</th><th>Level</th><th>Mode</th><th className="text-right">Score</th><th className="text-right">Accuracy</th></tr></thead>
                <tbody>
                  {records.slice(-25).reverse().map((r) => {
                    const g = GAME_BY_ID[r.gameId];
                    return (
                      <tr key={r.id} className="border-t border-line">
                        <td className="py-1.5">{new Date(r.startedAt).toLocaleString()}</td><td>{g?.name ?? r.gameId}</td><td className="capitalize">{r.difficulty}</td><td>{r.mode}</td>
                        <td className="text-right">{g ? fmtScore(g, r.result.score) : r.result.score}</td>
                        <td className="text-right">{r.result.total ? `${Math.round(((r.result.correct ?? 0) / r.result.total) * 100)}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
      <Panel className="flex flex-wrap items-center gap-3">
        <span className="mr-auto text-sm text-muted">Your data lives only in this browser.</span>
        <Button variant="outline" onClick={exportData}>Export progress</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>Import progress</Button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) alert(importData(await f.text()) ? 'Progress imported.' : 'That file is not a Floorwork export.'); }} />
        <Button variant="ask" onClick={() => { if (confirm('Delete all sessions and mistakes from this browser?')) resetAll(); }}>Delete all data</Button>
      </Panel>
    </div>
  );
}
