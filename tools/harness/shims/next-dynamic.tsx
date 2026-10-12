import { createElement, lazy, Suspense } from 'react';
export default function dynamic(loader: () => Promise<any>) {
  const L = lazy(() => loader().then((m) => ({ default: m.default ?? m })));
  return (p: any) => createElement(Suspense, { fallback: null }, createElement(L, p));
}
