/**
 * Pure scoring functions. Used by the browser (to render results) and the server
 * (which recomputes everything and never trusts a client-sent score).
 *
 * Faithful to the reference:
 *   exact = points / maxPoints * 100        (8 questions x 2 points = 16)
 *   shown = Math.round(exact)
 *   band  = first band whose min <= exact   (bands use the UNROUNDED value)
 * Added: per-dimension score using the same formula restricted to that dimension's questions.
 */
import {
  ALL_YES_START_AREA,
  BANDS,
  CHOICES,
  DIMENSIONS,
  QUESTIONS,
  type AreaState,
  type Band,
  type Choice,
  type ChoiceId,
  type Dimension,
  type Question,
} from '../data/assessment';

export type Answers = Partial<Record<string, ChoiceId>>;

export interface DimensionScore {
  id: Dimension['id'];
  code: string;
  name: string;
  points: number;
  maxPoints: number;
  /** Rounded 0-100. */
  percent: number;
  /** gap if any No/Not sure, look if any Partly, else ready. */
  state: AreaState;
}

export interface FollowUp {
  number: number;
  question: Question;
  choice: Choice;
}

export interface AssessmentResult {
  points: number;
  maxPoints: number;
  exact: number;
  percent: number;
  band: Band;
  counts: Record<ChoiceId, number>;
  dimensions: DimensionScore[];
  /** Every non-Yes answer, in question order. */
  followUps: FollowUp[];
  /** Same items, weakest first (No/Not sure before Partly, then question order) — the results page order. */
  followUpsByPriority: FollowUp[];
  /** Number of areas that are not "ready". */
  areasNeedingAttention: number;
  /** The area the review starts with: the lowest-scoring area (first on ties); drivers when all Yes. */
  startArea: DimensionScore;
}

const MAX_CHOICE_POINTS = Math.max(...CHOICES.map((c) => c.points));

export function getChoice(id: ChoiceId): Choice {
  const c = CHOICES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown choice: ${id}`);
  return c;
}

export function bandFor(exact: number): Band {
  // BANDS is ordered high -> low; the last band has min 0 and is the fallback.
  return BANDS.find((b) => exact >= b.min) ?? BANDS[BANDS.length - 1]!;
}

export function isComplete(answers: Answers, questions: Question[] = QUESTIONS): boolean {
  return questions.every((q) => answers[q.id] !== undefined);
}

export function firstUnansweredIndex(answers: Answers, questions: Question[] = QUESTIONS): number {
  const i = questions.findIndex((q) => answers[q.id] === undefined);
  return i === -1 ? questions.length : i;
}

export function calculateResult(answers: Answers, questions: Question[] = QUESTIONS): AssessmentResult {
  if (!isComplete(answers, questions)) {
    throw new Error('Cannot score an incomplete assessment');
  }
  const counts: Record<ChoiceId, number> = { yes: 0, partly: 0, no: 0, notsure: 0 };
  let points = 0;
  const followUps: FollowUp[] = [];

  questions.forEach((q, i) => {
    const choice = getChoice(answers[q.id]!);
    counts[choice.id]++;
    points += choice.points;
    if (choice.id !== 'yes') followUps.push({ number: i + 1, question: q, choice });
  });

  const maxPoints = questions.length * MAX_CHOICE_POINTS;
  const exact = maxPoints === 0 ? 0 : (points / maxPoints) * 100;

  const dimensions: DimensionScore[] = DIMENSIONS.map((d) => {
    const qs = questions.filter((q) => q.dimension === d.id);
    const dPoints = qs.reduce((sum, q) => sum + getChoice(answers[q.id]!).points, 0);
    const dMax = qs.length * MAX_CHOICE_POINTS;
    const ids = qs.map((q) => answers[q.id]);
    const state: AreaState = ids.some((c) => c === 'no' || c === 'notsure') ? 'gap' : ids.includes('partly') ? 'look' : 'ready';
    return {
      state,
      id: d.id,
      code: d.code,
      name: d.name,
      points: dPoints,
      maxPoints: dMax,
      percent: dMax === 0 ? 0 : Math.round((dPoints / dMax) * 100),
    };
  });

  const followUpsByPriority = [...followUps].sort((a, b) => a.choice.points - b.choice.points || a.number - b.number);
  const areasNeedingAttention = dimensions.filter((d) => d.state !== 'ready').length;
  const lowest = [...dimensions].sort((a, b) => a.points - b.points)[0]!;
  const startArea = areasNeedingAttention === 0 ? dimensions.find((d) => d.id === ALL_YES_START_AREA) ?? lowest : lowest;

  return {
    points,
    maxPoints,
    exact,
    percent: Math.round(exact),
    band: bandFor(exact),
    counts,
    dimensions,
    followUps,
    followUpsByPriority,
    areasNeedingAttention,
    startArea,
  };
}

/** "Yes 3, Partly 2, No 1, Not sure 2. Points 8 of 16." — the reference's tally line. */
export function tallyLine(r: AssessmentResult): string {
  return (
    `Yes ${r.counts.yes}, Partly ${r.counts.partly}, No ${r.counts.no}, Not sure ${r.counts.notsure}. ` +
    `Points ${r.points} of ${r.maxPoints}.`
  );
}
