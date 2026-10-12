// Sandbox stand-in implementing the subset of zustand used by the app.
import { useSyncExternalStore } from 'react';
export function create<T>() {
  return (init: any) => {
    let state: T; const subs = new Set<() => void>();
    const set = (p: any) => { state = { ...state, ...(typeof p === 'function' ? p(state) : p) }; subs.forEach((f) => f()); };
    const get = () => state;
    state = init(set, get);
    const hook: any = (sel?: (s: T) => any) => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => (sel ? sel(state) : state));
    hook.getState = get; hook.setState = set;
    return hook;
  };
}
