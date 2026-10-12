import { createRoot } from 'react-dom/client';
import { createElement as h, useEffect, useState } from 'react';
import Header from '@/components/Header';
import Library from '@/app/page';
import Assessment from '@/app/assessment/page';
import Stats from '@/app/stats/page';
import Review from '@/app/review/page';
import Session from '@/app/session/page';
import Daily from '@/app/daily/page';
import PlayClient from '@/app/play/[id]/PlayClient';
function Router() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setHash(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const path = hash.split('?')[0];
  let page: any = null;
  if (path === '/') page = h(Library);
  else if (path === '/assessment') page = h(Assessment);
  else if (path === '/stats') page = h(Stats);
  else if (path === '/review') page = h(Review);
  else if (path === '/session') page = h(Session);
  else if (path === '/daily') page = h(Daily);
  else if (path.startsWith('/play/')) page = h(PlayClient, { key: hash, id: path.slice(6) });
  return h('div', null, h(Header), h('main', null, page));
}
createRoot(document.getElementById('root')!).render(h(Router));
