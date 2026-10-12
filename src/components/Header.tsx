'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore, type Theme } from '@/lib/store';
import { useKeys } from '@/hooks/useKeys';

const NAV = [['/', 'Library'], ['/assessment', 'Interview assessment'], ['/daily', 'Daily'], ['/session', 'Custom session'], ['/review', 'Mistakes'], ['/stats', 'Progress']] as const;

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  const inGame = () => path.startsWith('/play/') || document.body.dataset.playing === '1';
  useKeys({ g: () => !inGame() && router.push('/'), t: () => !inGame() && setTheme(theme === 'dark' ? 'light' : 'dark') });
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">Floorwork</Link>
        <nav className="flex flex-1 flex-wrap gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={`rounded px-2.5 py-1.5 ${path === href ? 'bg-paper font-medium' : 'text-muted hover:text-ink'}`}>{label}</Link>
          ))}
        </nav>
        <button onClick={() => setTheme(next[theme])} className="rounded px-2.5 py-1.5 text-sm text-muted hover:text-ink" aria-label="Change theme">
          Theme: {theme}
        </button>
      </div>
    </header>
  );
}
