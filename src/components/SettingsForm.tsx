'use client';
import type { SettingDef, Settings } from '@/lib/types';

export default function SettingsForm({ defs, value, onChange }: { defs: SettingDef[]; value: Settings; onChange: (s: Settings) => void }) {
  const set = (k: string, v: Settings[string]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      {defs.map((d) => (
        <label key={d.key} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0">
            {d.label}
            {d.help && <span className="block text-xs text-muted">{d.help}</span>}
          </span>
          {d.type === 'boolean' ? (
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={value[d.key] === true} onChange={(e) => set(d.key, e.target.checked)} />
          ) : d.type === 'select' ? (
            <select className="rounded-md border border-line bg-paper px-2 py-1" value={String(value[d.key])} onChange={(e) => set(d.key, e.target.value)}>
              {d.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <span className="flex items-center gap-1">
              <input
                type="number" className="num w-20 rounded-md border border-line bg-paper px-2 py-1 text-right" min={d.min} max={d.max} step={d.step ?? 1}
                value={Number(value[d.key] ?? d.min)}
                onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) set(d.key, Math.min(d.max, Math.max(d.min, v))); }}
              />
              {d.unit && <span className="w-6 text-xs text-muted">{d.unit}</span>}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
