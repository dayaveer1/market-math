'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Difficulty, GameResult, Mistake, Settings } from './types';

export type PlayMode = 'standard' | 'practice' | 'interview' | 'daily' | 'custom-session';
export interface SessionRecord {
  id: string;
  gameId: string;
  difficulty: Difficulty;
  mode: PlayMode;
  settings: Settings;
  startedAt: number;
  durationMs: number;
  result: GameResult;
}
export interface MistakeRecord extends Mistake { id: string; gameId: string; at: number; reviewed: boolean }
export type Theme = 'light' | 'dark' | 'system';
export interface BatteryRecord {
  id: string; name: string; presetId: string | null; startedAt: number; minutes: number; level: string; overall: number;
  sections: { gameId: string; weight: number; score: number; norm: number; accuracy: number | null; seconds: number }[];
}

interface State {
  records: SessionRecord[];
  mistakes: MistakeRecord[];
  batteries: BatteryRecord[];
  addBattery: (b: Omit<BatteryRecord, 'id'>) => void;
  lastConfig: Record<string, { difficulty: Difficulty; settings: Settings }>;
  theme: Theme;
  addRecord: (r: Omit<SessionRecord, 'id'>) => void;
  addMistakes: (gameId: string, m: Mistake[]) => void;
  setReviewed: (id: string, reviewed: boolean) => void;
  removeMistake: (id: string) => void;
  setLastConfig: (gameId: string, difficulty: Difficulty, settings: Settings) => void;
  setTheme: (t: Theme) => void;
  importData: (json: string) => boolean;
  resetAll: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const STORAGE_KEY = 'floorwork:v1';
const MAX_RECORDS = 5000;
const MAX_MISTAKES = 1000;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      records: [],
      mistakes: [],
      batteries: [],
      addBattery: (b) => set({ batteries: [...get().batteries, { ...b, id: uid() }].slice(-500) }),
      lastConfig: {},
      theme: 'system',
      addRecord: (r) => set({ records: [...get().records, { ...r, id: uid() }].slice(-MAX_RECORDS) }),
      addMistakes: (gameId, m) =>
        m.length && set({ mistakes: [...get().mistakes, ...m.map((x) => ({ ...x, id: uid(), gameId, at: Date.now(), reviewed: false }))].slice(-MAX_MISTAKES) }),
      setReviewed: (id, reviewed) => set({ mistakes: get().mistakes.map((m) => (m.id === id ? { ...m, reviewed } : m)) }),
      removeMistake: (id) => set({ mistakes: get().mistakes.filter((m) => m.id !== id) }),
      setLastConfig: (gameId, difficulty, settings) => set({ lastConfig: { ...get().lastConfig, [gameId]: { difficulty, settings } } }),
      setTheme: (theme) => set({ theme }),
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          if (!Array.isArray(d.records) || !Array.isArray(d.mistakes)) return false;
          set({ records: d.records, mistakes: d.mistakes, lastConfig: d.lastConfig ?? {}, batteries: Array.isArray(d.batteries) ? d.batteries : [] });
          return true;
        } catch { return false; }
      },
      resetAll: () => set({ records: [], mistakes: [], lastConfig: {}, batteries: [] }),
    }),
    { name: STORAGE_KEY, version: 2, storage: createJSONStorage(() => localStorage), migrate: (old: unknown) => ({ batteries: [], ...(old as object) }) as unknown as State },
  ),
);

/** True once zustand has rehydrated from localStorage (avoids SSR/client mismatches). */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
