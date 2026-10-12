export function createJSONStorage(f: () => Storage) { return f; }
export function persist(fn: any, opts: any) {
  return (set: any, get: any) => {
    const save = () => { try { localStorage.setItem(opts.name, JSON.stringify({ state: get(), version: opts.version })); } catch {} };
    const wrapped = (p: any) => { set(p); save(); };
    let base = fn(wrapped, get);
    try { const raw = localStorage.getItem(opts.name); if (raw) { const d = JSON.parse(raw); const st = d.version !== opts.version && opts.migrate ? opts.migrate(d.state, d.version) : d.state; base = { ...base, ...st }; } } catch {}
    return base;
  };
}
