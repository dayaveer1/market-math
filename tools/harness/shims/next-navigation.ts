import { useEffect, useState } from 'react';
const path = () => (location.hash.slice(1) || '/').split('?')[0];
export function usePathname() { const [p, setP] = useState(path()); useEffect(() => { const h = () => setP(path()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []); return p; }
export function useRouter() { return { push: (h: string) => { location.hash = h; } }; }
export function useSearchParams() { const q = (location.hash.split('?')[1] ?? ''); return new URLSearchParams(q); }
export function notFound(): never { throw new Error('notFound'); }
