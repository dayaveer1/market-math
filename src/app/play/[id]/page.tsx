import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { GAMES, GAME_BY_ID } from '@/lib/registry';
import PlayClient from './PlayClient';

/** Static export: every activity page is generated at build time; unknown ids fall through to the 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}
export function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `${GAME_BY_ID[params.id]?.name ?? 'Game'} — Floorwork` };
}
export default function Page({ params }: { params: { id: string } }) {
  if (!GAME_BY_ID[params.id]) notFound();
  return <Suspense><PlayClient id={params.id} /></Suspense>;
}
