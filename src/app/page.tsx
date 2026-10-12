'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { CATEGORY_LABEL, CATEGORY_ORDER, GAMES } from '@/lib/registry';
import { useHydrated, useStore } from '@/lib/store';
import { accuracy, best, fmtScore, streakDays } from '@/lib/stats';
import { useKeys } from '@/hooks/useKeys';
import type { Category } from '@/lib/types';
import { Kbd } from '@/components/ui';

export default function Library() {
  const hydrated = useHydrated();
  const records = useStore((s) => s.records);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [q, setQ] = useState('');
  const search = useRef<HTMLInputElement>(null);
  useKeys({ '/': (e) => { e.preventDefault(); search.current?.focus(); } });

  const shown = useMemo(() => GAMES.filter((g) => (cat === 'all' || g.category === cat) && (g.name + ' ' + g.summary).toLowerCase().includes(q.toLowerCase())), [cat, q]);
  const week = hydrated ? records.filter((r) => Date.now() - r.startedAt < 7 * 864e5) : [];
  const acc = hydrated ? accuracy(week) : null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{GAMES.length} drills, simulators and timed tests for the trading interview, all free and on your machine.</h1>
          <p className="mt-3 text-muted">Every difficulty and setting is open. Progress stays in this browser.</p>
        </div>
        <dl className="num flex gap-8 text-sm">
          <div><dt className="text-muted">Sessions this week</dt><dd className="text-2xl font-semibold">{week.length}</dd></div>
          <div><dt className="text-muted">Accuracy</dt><dd className="text-2xl font-semibold">{acc === null ? '—' : `${Math.round(acc * 100)}%`}</dd></div>
          <div><dt className="text-muted">Streak</dt><dd className="text-2xl font-semibold">{hydrated ? streakDays(records) : 0}d</dd></div>
        </dl>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 text-sm">
          {(['all', ...CATEGORY_ORDER] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded px-3 py-1.5 ${cat === c ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
              {c === 'all' ? 'All' : CATEGORY_LABEL[c]} <span className="num opacity-60">{c === 'all' ? GAMES.length : GAMES.filter((g) => g.category === c).length}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a drill" className="w-48 rounded-md border border-line bg-surface px-3 py-1.5" aria-label="Find a drill" />
          <Kbd>/</Kbd>
        </label>
      </div>

      {CATEGORY_ORDER.filter((c) => shown.some((g) => g.category === c)).map((c) => (
        <section key={c}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{CATEGORY_LABEL[c]}</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {shown.filter((g) => g.category === c).map((g) => {
              const b = hydrated ? best(records, g) : null;
              const n = hydrated ? records.filter((r) => r.gameId === g.id).length : 0;
              return (
                <Link key={g.id} href={`/play/${g.id}`} data-testid={`game-${g.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-line px-4 py-3 last:border-0 hover:bg-paper sm:grid-cols-[16rem_1fr_7rem_5rem]">
                  <span className="font-medium">{g.name}</span>
                  <span className="order-3 col-span-2 text-sm text-muted sm:order-none sm:col-span-1">{g.summary}</span>
                  <span className="num text-right text-sm">{b === null ? <span className="text-muted">—</span> : <>{fmtScore(g, b)} <span className="text-xs text-muted">best</span></>}</span>
                  <span className="num hidden text-right text-xs text-muted sm:block">{n} played</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {shown.length === 0 && <p className="text-muted">No drill matches “{q}”. Clear the search to see all {GAMES.length}.</p>}
      <p className="text-xs text-muted">Shortcuts: <Kbd>/</Kbd> search · <Kbd>G</Kbd> library · <Kbd>T</Kbd> theme · <Kbd>Enter</Kbd> start · <Kbd>Esc</Kbd> quit a game</p>
    </div>
  );
}
