/** Storage helpers that never throw (private mode, blocked cookies, SSR). */
import type { StateStorage } from 'zustand/middleware';
import type { ChoiceId, PowerUnits } from '../data/assessment';

function safe(kind: 'local' | 'session'): Storage | null {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    const k = '__probe__';
    s.setItem(k, k);
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function makeStateStorage(kind: 'local' | 'session'): StateStorage {
  return {
    getItem: (name) => safe(kind)?.getItem(name) ?? null,
    setItem: (name, value) => {
      try {
        safe(kind)?.setItem(name, value);
      } catch {
        /* quota or blocked */
      }
    },
    removeItem: (name) => {
      try {
        safe(kind)?.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

export function readJSON<T>(kind: 'local' | 'session', key: string): T | null {
  try {
    const raw = safe(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(kind: 'local' | 'session', key: string, value: unknown): void {
  try {
    safe(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function remove(kind: 'local' | 'session', key: string): void {
  try {
    safe(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Non-PII record of the last completed check, kept across visits for the "already submitted" state. */
export interface LastSubmission {
  submissionId: string;
  answers: Record<string, ChoiceId>;
  powerUnits: PowerUnits | null;
  completedAt: string;
  delivered: boolean;
}
export const LAST_KEY = 'audit:last';
export const getLastSubmission = () => readJSON<LastSubmission>('local', LAST_KEY);
export const setLastSubmission = (v: LastSubmission) => writeJSON('local', LAST_KEY, v);
export const clearLastSubmission = () => remove('local', LAST_KEY);
