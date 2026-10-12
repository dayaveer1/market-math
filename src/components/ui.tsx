'use client';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'quiet' | 'bid' | 'ask' | 'outline';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110',
  quiet: 'bg-transparent text-ink hover:bg-line/50',
  outline: 'border border-line bg-surface text-ink hover:border-accent',
  bid: 'bg-bid text-white hover:brightness-110',
  ask: 'bg-ask text-white hover:brightness-110',
};
export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${className}`} />;
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface p-4 sm:p-6 ${className}`}>{children}</div>;
}
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'bid' | 'ask' }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num text-xl font-semibold ${tone === 'bid' ? 'text-bid' : tone === 'ask' ? 'text-ask' : ''}`}>{value}</div>
    </div>
  );
}
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] font-medium text-muted">{children}</kbd>;
}
export function TimeBar({ leftMs, totalMs }: { leftMs: number | null; totalMs: number }) {
  if (leftMs === null || totalMs <= 0) return null;
  const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
  return (
    <div className="flex items-center gap-3" aria-label="Time remaining">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${pct < 20 ? 'bg-ask' : 'bg-accent'}`} style={{ width: `${pct}%`, transition: 'width 100ms linear' }} />
      </div>
      <span className="num w-12 text-right text-sm text-muted">{Math.ceil(leftMs / 1000)}s</span>
    </div>
  );
}
export function Feedback({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  if (ok === null) return <div className="min-h-[1.5rem]" />;
  return <div role="status" className={`min-h-[1.5rem] text-sm font-medium ${ok ? 'text-bid' : 'text-ask'}`}>{children}</div>;
}
export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function NumberInput(p, ref) {
  return <input ref={ref} inputMode="decimal" autoComplete="off" spellCheck={false} {...p} className={`num w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent ${p.className ?? ''}`} />;
});
