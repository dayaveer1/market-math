'use client';
import { useSearchParams } from 'next/navigation';
import GameShell from '@/components/GameShell';
import { GAME_BY_ID } from '@/lib/registry';
import type { Settings } from '@/lib/types';

/** Settings links: /play/<id>?s=<json settings>&seed=<n>&autostart=1 (used for sharing setups and by e2e tests). */
function parseInitial(p: URLSearchParams) {
  let settings: Settings | undefined;
  try { const raw = p.get('s'); if (raw) settings = JSON.parse(raw); } catch { settings = undefined; }
  const seed = p.get('seed');
  return { settings, autostart: p.get('autostart') === '1', seed: seed && /^\d+$/.test(seed) ? Number(seed) : undefined };
}

export default function PlayClient({ id }: { id: string }) {
  const params = useSearchParams();
  return <GameShell key={params.toString()} meta={GAME_BY_ID[id]} initial={parseInitial(new URLSearchParams(params.toString()))} />;
}
