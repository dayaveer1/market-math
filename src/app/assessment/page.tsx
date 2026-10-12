'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SessionRunner from '@/components/SessionRunner';
import { BATTERY_PRESETS, band, normalize, overallScore, planSections, sectionSettings } from '@/lib/battery';
import { CATEGORY_LABEL, CATEGORY_ORDER, GAMES, GAME_BY_ID } from '@/lib/registry';
import { useHydrated, useStore, type BatteryRecord, type SessionRecord } from '@/lib/store';
import { fmtScore } from '@/lib/stats';
import { newSeed } from '@/lib/rng';
import type { PresetLevel } from '@/lib/types';
import { Button, Panel, Stat } from '@/components/ui';

type Plan = { name: string; presetId: string | null; level: PresetLevel; minutes: number; sections: { gameId: string; weight: number; seconds: number }[] };

function Clock({ start, minutes }: { start: number; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const el = Math.floor((now - start) / 1000);
  return <span className="num">{Math.floor(el / 60)}:{String(el % 60).padStart(2, '0')} elapsed of ~{minutes}:00 planned</span>;
}

function Results({ rec }: { rec: BatteryRecord }) {
  const data = rec.sections.map((s) => ({ name: GAME_BY_ID[s.gameId]?.name ?? s.gameId, score: s.norm }));
  const weakest = rec.sections.slice().sort((a, b) => a.norm - b.norm)[0];
  return (
    <div className="space-y-6" data-testid="battery-results">
      <div className="flex flex-wrap items-end gap-8">
        <Stat label="Overall" value={<span data-testid="overall">{rec.overall}/100</span>} />
        <Stat label="Band" value={band(rec.overall)} />
        <Stat label="Sections" value={rec.sections.length} />
      </div>
      <div className="overflow-x-auto">
        <table className="num w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th className="py-1">Section</th><th>Time</th><th>Weight</th><th className="text-right">Raw score</th><th className="text-right">Accuracy</th><th className="text-right">Section score</th></tr></thead>
          <tbody>{rec.sections.map((s, i) => {
            const g = GAME_BY_ID[s.gameId];
            return <tr key={i} className="border-t border-line"><td className="py-1.5">{g?.name}</td><td>{Math.round(s.seconds / 60)} min</td><td>{s.weight}</td><td className="text-right">{g ? fmtScore(g, s.score) : s.score}</td><td className="text-right">{s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`}</td><td className="text-right font-semibold">{s.norm}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="rgb(var(--muted))" fontSize={10} interval={0} />
            <YAxis domain={[0, 100]} stroke="rgb(var(--muted))" fontSize={12} />
            <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))' }} />
            <Bar dataKey="score" fill="rgb(var(--accent))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {weakest && <p className="text-sm text-muted">Weakest section: <span className="text-ink">{GAME_BY_ID[weakest.gameId]?.name}</span> ({weakest.norm}). Practise it from the library, then retake the battery.</p>}
      <p className="text-xs text-muted">Section scores use an original 0–100 rubric (accuracy and pace for tests, a smooth P&L curve for trading games). They are a training signal, not a prediction of any firm&rsquo;s decision.</p>
    </div>
  );
}

export default function AssessmentPage() {
  const hydrated = useHydrated();
  const { batteries, addBattery } = useStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BatteryRecord | null>(null);
  const [custom, setCustom] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [level, setLevel] = useState<PresetLevel>('medium');
  const seeds = useRef<number[]>([]);
  const started = useRef(Date.now());

  const choose = (p: Plan) => { setPlan(p); setResult(null); };
  const start = () => { if (!plan) return; seeds.current = plan.sections.map(() => newSeed()); started.current = Date.now(); setRunning(true); };
  const settingsFor = useMemo(() => (i: number) => plan ? sectionSettings(GAME_BY_ID[plan.sections[i].gameId], plan.sections[i].seconds, plan.level) : {}, [plan]);

  const done = (recs: Omit<SessionRecord, 'id'>[]) => {
    if (!plan) return;
    const sections = recs.map((r, i) => {
      const meta = GAME_BY_ID[r.gameId];
      return { gameId: r.gameId, weight: plan.sections[i].weight, seconds: plan.sections[i].seconds, score: r.result.score, accuracy: r.result.total ? (r.result.correct ?? 0) / r.result.total : null, norm: normalize(meta, r.result, r.settings) };
    });
    const rec: Omit<BatteryRecord, 'id'> = { name: plan.name, presetId: plan.presetId, startedAt: started.current, minutes: plan.minutes, level: plan.level, sections, overall: overallScore(sections) };
    addBattery(rec);
    setResult({ ...rec, id: 'latest' });
    setRunning(false);
  };

  if (running && plan) {
    return <SessionRunner ids={plan.sections.map((s) => s.gameId)} level={plan.level} mode="interview" seeds={seeds.current} settingsFor={settingsFor} onDone={done}
      header={<div className="flex flex-wrap justify-between gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm"><span className="font-medium">{plan.name}</span><Clock start={started.current} minutes={plan.minutes} /></div>} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Interview assessment</h1>
        <p className="mt-1 max-w-prose text-muted">Several drills back to back as timed sections, like a recruitment test day. Each section is scored 0–100 and combined into an overall score with a breakdown.</p>
      </div>
      {result && <Panel><h2 className="mb-4 text-lg font-semibold">{result.name}: results</h2><Results rec={result} /></Panel>}
      <section className="grid gap-3 md:grid-cols-2">
        {BATTERY_PRESETS.map((p) => (
          <button key={p.id} onClick={() => choose({ name: p.name, presetId: p.id, level: p.level, minutes: p.minutes, sections: planSections(p.sections, p.minutes) })}
            className={`rounded-lg border p-4 text-left ${plan?.presetId === p.id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-accent'}`}>
            <div className="flex justify-between"><span className="font-semibold">{p.name}</span><span className="num text-sm text-muted">{p.minutes} min · {p.level}</span></div>
            <p className="mt-1 text-sm text-muted">{p.description}</p>
          </button>
        ))}
      </section>
      <Panel className="space-y-4">
        <h2 className="font-semibold">Build your own</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Total minutes <input type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 5)))} className="num w-20 rounded-md border border-line bg-paper px-2 py-1" /></label>
          {(['easy', 'medium', 'hard'] as const).map((l) => <Button key={l} variant={level === l ? 'primary' : 'outline'} className="capitalize" onClick={() => setLevel(l)}>{l}</Button>)}
          <Button className="ml-auto" disabled={custom.length === 0} onClick={() => choose({ name: 'Custom assessment', presetId: null, level, minutes, sections: planSections(custom.map((g) => ({ gameId: g, weight: 1 })), minutes) })}>Use {custom.length} section{custom.length === 1 ? '' : 's'}</Button>
        </div>
        {CATEGORY_ORDER.map((c) => (
          <div key={c}>
            <div className="mb-1 text-xs font-semibold text-muted">{CATEGORY_LABEL[c]}</div>
            <div className="flex flex-wrap gap-1.5">{GAMES.filter((g) => g.category === c).map((g) => {
              const k = custom.indexOf(g.id);
              return <button key={g.id} onClick={() => setCustom((x) => (k >= 0 ? x.filter((y) => y !== g.id) : [...x, g.id]))} aria-pressed={k >= 0} className={`rounded border px-2 py-1 text-xs ${k >= 0 ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}>{k >= 0 && <span className="num mr-1 font-semibold text-accent">{k + 1}</span>}{g.name}</button>;
            })}</div>
          </div>
        ))}
      </Panel>
      {plan && (
        <Panel className="space-y-3">
          <h2 className="font-semibold">{plan.name} · {plan.minutes} minutes · {plan.level}</h2>
          <ol className="space-y-1 text-sm">{plan.sections.map((s, i) => <li key={i} className="flex justify-between"><span><span className="num mr-2 text-muted">{i + 1}</span>{GAME_BY_ID[s.gameId].name}</span><span className="num text-muted">{Math.round(s.seconds / 60)} min · weight {s.weight}</span></li>)}</ol>
          <p className="text-xs text-muted">Timed sections use the section length; round-based games get a number of rounds that fits it. Sections run in order with no going back.</p>
          <Button onClick={start} data-testid="start-battery">Start assessment</Button>
        </Panel>
      )}
      {hydrated && batteries.length > 0 && (
        <Panel>
          <h2 className="mb-3 font-semibold">Past assessments</h2>
          <table className="num w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-1">When</th><th>Assessment</th><th>Level</th><th className="text-right">Overall</th><th className="text-right">Band</th></tr></thead>
            <tbody>{batteries.slice(-15).reverse().map((b) => <tr key={b.id} className="border-t border-line"><td className="py-1.5">{new Date(b.startedAt).toLocaleString()}</td><td>{b.name}</td><td className="capitalize">{b.level}</td><td className="text-right">{b.overall}</td><td className="text-right">{band(b.overall)}</td></tr>)}</tbody></table>
        </Panel>
      )}
    </div>
  );
}
