/**
 * App state (Zustand), persisted to sessionStorage so a refresh keeps answers and details for this tab only.
 * A non-PII record of the completed check is kept in localStorage (see storage.ts) for the "already submitted" state.
 *
 * Flow inside the modal: questions (0-7) -> units -> lead -> calc (submits) -> results | error
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { QUESTIONS, type ChoiceId, type PowerUnits } from '../data/assessment';
import type { LeadInput, SubmitFailure, SubmitSuccess } from '../schemas/submission';
import { firstUnansweredIndex } from '../lib/scoring';
import { makeStateStorage } from '../lib/storage';

export type Step = 'questions' | 'units' | 'lead' | 'calc' | 'results' | 'error';
export type SubmitErrorKind = 'network' | SubmitFailure['code'];

export interface AssessmentState {
  modalOpen: boolean;
  step: Step;
  index: number;
  answers: Record<string, ChoiceId>;
  powerUnits: PowerUnits | null;
  lead: LeadInput | null;
  submissionId: string;
  /** When the check was first opened (client clock); used for the minimum-time bot check. */
  startedAt: number | null;
  honeypot: string;
  turnstileToken: string | null;
  outcome: Pick<SubmitSuccess, 'status' | 'existingContact' | 'requestId'> | null;
  error: { kind: SubmitErrorKind; message: string; requestId?: string } | null;
  /** In-progress state was restored after a refresh (not persisted). */
  restored: boolean;
  /** Results opened from a previous visit (localStorage), not from a fresh submission. */
  viewingPrevious: boolean;

  open: () => void;
  close: () => void;
  answer: (questionId: string, choice: ChoiceId) => void;
  advance: () => void;
  back: () => void;
  setUnits: (u: PowerUnits) => void;
  setLead: (lead: LeadInput, honeypot: string, turnstileToken: string | null) => void;
  setTurnstileToken: (t: string | null) => void;
  goTo: (s: Step) => void;
  setOutcome: (o: AssessmentState['outcome']) => void;
  setError: (e: AssessmentState['error']) => void;
  showPrevious: (answers: Record<string, ChoiceId>, powerUnits: PowerUnits | null, submissionId: string) => void;
  dismissRestored: () => void;
  /** Start again. Keeps the lead details so a retake skips the form. */
  retake: () => void;
  reset: () => void;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const initial = () => ({
  modalOpen: false,
  step: 'questions' as Step,
  index: 0,
  answers: {} as Record<string, ChoiceId>,
  powerUnits: null as PowerUnits | null,
  lead: null as LeadInput | null,
  submissionId: newId(),
  startedAt: null as number | null,
  honeypot: '',
  turnstileToken: null as string | null,
  outcome: null as AssessmentState['outcome'],
  error: null as AssessmentState['error'],
  restored: false,
  viewingPrevious: false,
});

/** Merge persisted session state into the fresh store, guarding against stale or hand-edited storage. */
export function sanitizeRestored(p: Partial<AssessmentState> | undefined, current: AssessmentState): AssessmentState {
  if (!p || typeof p !== 'object') return current;
  const validChoices = new Set<string>(['yes', 'partly', 'no', 'notsure']);
  const answers = Object.fromEntries(
    Object.entries(p.answers ?? {}).filter(([k, v]) => QUESTIONS.some((q) => q.id === k) && validChoices.has(v)),
  ) as Record<string, ChoiceId>;
  const s: AssessmentState = { ...current, ...p, answers, modalOpen: false };
  const firstGap = firstUnansweredIndex(answers);
  if (firstGap < QUESTIONS.length) {
    // Resume at the first unanswered question.
    s.step = 'questions';
    s.index = firstGap;
  } else if (s.step === 'questions') {
    s.step = 'units';
  }
  if (s.step === 'lead' && !s.powerUnits) s.step = 'units';
  if ((s.step === 'calc' || s.step === 'error') && (!s.lead || !s.powerUnits)) s.step = s.powerUnits ? 'lead' : 'units';
  if (s.step === 'results' && !s.outcome && !s.viewingPrevious) s.step = s.lead ? 'calc' : 'lead';
  s.index = Math.min(Math.max(0, Number(s.index) || 0), QUESTIONS.length - 1);
  const inProgress = Object.keys(answers).length > 0 && s.step !== 'results';
  s.restored = inProgress;
  // Reopen the check on refresh so the visitor lands where they were.
  s.modalOpen = inProgress || s.step === 'results';
  return s;
}

export const useAssessment = create<AssessmentState>()(
  persist(
    (set, get) => ({
      ...initial(),
      open: () => set({ modalOpen: true, startedAt: get().startedAt ?? Date.now() }),
      close: () => set({ modalOpen: false, restored: false }),
      answer: (questionId, choice) => set({ answers: { ...get().answers, [questionId]: choice } }),
      advance: () => {
        const { index, answers } = get();
        const q = QUESTIONS[index];
        if (!q || !answers[q.id]) return;
        if (index < QUESTIONS.length - 1) set({ index: index + 1, restored: false });
        else set({ step: 'units', restored: false });
      },
      back: () => {
        const { step, index } = get();
        if (step === 'units') set({ step: 'questions', index: QUESTIONS.length - 1 });
        else if (step === 'lead') set({ step: 'units' });
        else if (index > 0) set({ index: index - 1 });
        set({ restored: false });
      },
      setUnits: (powerUnits) => set({ powerUnits, step: get().lead ? 'calc' : 'lead' }),
      setLead: (lead, honeypot, turnstileToken) => set({ lead, honeypot, turnstileToken, step: 'calc' }),
      setTurnstileToken: (turnstileToken) => set({ turnstileToken }),
      goTo: (step) => set({ step }),
      setOutcome: (outcome) => set({ outcome, error: null, step: 'results' }),
      setError: (error) => set({ error, step: 'error' }),
      showPrevious: (answers, powerUnits, submissionId) =>
        set({ ...initial(), answers, powerUnits, submissionId, step: 'results', viewingPrevious: true, modalOpen: true }),
      dismissRestored: () => set({ restored: false }),
      retake: () => {
        const { lead } = get();
        set({ ...initial(), lead, modalOpen: true, startedAt: Date.now() });
      },
      reset: () => set({ ...initial() }),
    }),
    {
      name: 'audit:session',
      version: 2,
      storage: createJSONStorage(() => makeStateStorage('session')),
      partialize: (s) => ({
        step: s.step,
        index: s.index,
        answers: s.answers,
        powerUnits: s.powerUnits,
        lead: s.lead,
        submissionId: s.submissionId,
        startedAt: s.startedAt,
        outcome: s.outcome,
        error: s.error,
        viewingPrevious: s.viewingPrevious,
      }),
      merge: (persisted, current) => sanitizeRestored(persisted as Partial<AssessmentState> | undefined, current),
    },
  ),
);
