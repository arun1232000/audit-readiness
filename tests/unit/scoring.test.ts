import { describe, expect, it } from 'vitest';
import { BANDS, QUESTIONS, type ChoiceId } from '../../src/data/assessment';
import { bandFor, calculateResult, firstUnansweredIndex, isComplete, tallyLine } from '../../src/lib/scoring';
import { whatsappText } from '../../src/lib/summary';

const all = (c: ChoiceId) => Object.fromEntries(QUESTIONS.map((q) => [q.id, c])) as Record<string, ChoiceId>;
const seq = (...cs: ChoiceId[]) => Object.fromEntries(QUESTIONS.map((q, i) => [q.id, cs[i]!])) as Record<string, ChoiceId>;

describe('assessment data', () => {
  it('has 8 questions, 2 per area, and bands ordered high to low ending at 0', () => {
    expect(QUESTIONS).toHaveLength(8);
    const per = QUESTIONS.reduce<Record<string, number>>((m, q) => ({ ...m, [q.dimension]: (m[q.dimension] ?? 0) + 1 }), {});
    expect(per).toEqual({ admin: 2, drivers: 2, equipment: 2, overall: 2 });
    expect(BANDS.map((b) => b.min)).toEqual([85, 60, 0]);
  });
});

describe('calculateResult (reference formula: points/16*100)', () => {
  it('all Yes = 100%, Strong Start!, no follow-ups', () => {
    const r = calculateResult(all('yes'));
    expect(r).toMatchObject({ points: 16, maxPoints: 16, percent: 100 });
    expect(r.band.name).toBe('Strong Start!');
    expect(r.followUps).toHaveLength(0);
    expect(r.dimensions.every((d) => d.percent === 100)).toBe(true);
  });

  it('all Partly = 50%, Time for a Closer Look!', () => {
    const r = calculateResult(all('partly'));
    expect(r.percent).toBe(50);
    expect(r.band.id).toBe('closer');
  });

  it('No and Not sure both score 0', () => {
    expect(calculateResult(all('no')).points).toBe(0);
    expect(calculateResult(all('notsure')).points).toBe(0);
  });

  it.each([
    [14, 87.5, 88, 'strong'],
    [13, 81.25, 81, 'almost'],
    [10, 62.5, 63, 'almost'],
    [9, 56.25, 56, 'closer'],
  ])('%i points -> exact %f, shown %i%%, band %s', (points, exact, shown, band) => {
    // Build answers totalling `points`: as many Yes (2) as possible, then a Partly (1), rest No.
    const cs: ChoiceId[] = [];
    let left = points;
    for (let i = 0; i < 8; i++) {
      const c: ChoiceId = left >= 2 ? 'yes' : left === 1 ? 'partly' : 'no';
      cs.push(c);
      left -= c === 'yes' ? 2 : c === 'partly' ? 1 : 0;
    }
    const r = calculateResult(seq(...cs));
    expect(r.points).toBe(points);
    expect(r.exact).toBeCloseTo(exact);
    expect(r.percent).toBe(shown);
    expect(r.band.id).toBe(band);
  });

  it('chooses the band from the EXACT score, not the rounded one', () => {
    expect(bandFor(84.9).id).toBe('almost');
    expect(bandFor(85).id).toBe('strong');
    expect(bandFor(59.99).id).toBe('closer');
    expect(bandFor(60).id).toBe('almost');
  });

  it('computes per-area scores and lists follow-ups for every non-Yes answer, in order', () => {
    const r = calculateResult(seq('yes', 'partly', 'no', 'notsure', 'yes', 'yes', 'partly', 'yes'));
    expect(r.dimensions.map((d) => [d.id, d.percent])).toEqual([
      ['admin', 75],
      ['drivers', 0],
      ['equipment', 100],
      ['overall', 75],
    ]);
    expect(r.followUps.map((f) => [f.number, f.choice.short])).toEqual([
      [2, 'Partly'],
      [3, 'No'],
      [4, 'Not sure'],
      [7, 'Partly'],
    ]);
    expect(r.counts).toEqual({ yes: 4, partly: 2, no: 1, notsure: 1 });
    expect(tallyLine(r)).toBe('Yes 4, Partly 2, No 1, Not sure 1. Points 10 of 16.');
  });

  it('marks area states, orders follow-ups weakest first, and picks the area to start with', () => {
    const r = calculateResult(seq('yes', 'partly', 'no', 'notsure', 'yes', 'yes', 'partly', 'yes'));
    expect(r.dimensions.map((d) => [d.id, d.state])).toEqual([
      ['admin', 'look'],
      ['drivers', 'gap'],
      ['equipment', 'ready'],
      ['overall', 'look'],
    ]);
    expect(r.areasNeedingAttention).toBe(3);
    expect(r.followUpsByPriority.map((f) => f.number)).toEqual([3, 4, 2, 7]);
    expect(r.startArea.id).toBe('drivers');
    // Ties go to the first area in order.
    expect(calculateResult(all('partly')).startArea.id).toBe('admin');
    // All Yes starts with driver files.
    const y = calculateResult(all('yes'));
    expect(y.areasNeedingAttention).toBe(0);
    expect(y.startArea.id).toBe('drivers');
  });

  it('refuses incomplete answers', () => {
    const a = all('yes');
    delete a.q5;
    expect(isComplete(a)).toBe(false);
    expect(firstUnansweredIndex(a)).toBe(4);
    expect(() => calculateResult(a)).toThrow(/incomplete/);
  });
});

describe('whatsappText', () => {
  it('matches the reference message structure', () => {
    const text = whatsappText(calculateResult(seq('yes', 'no', 'yes', 'yes', 'yes', 'yes', 'yes', 'yes')), {
      firstName: 'Sam',
      powerUnits: '5 to 20',
    });
    expect(text.split('\n')).toEqual([
      'Hello Prime Compliance, I took the Are you audit ready? check. My name is Sam.',
      'Power units: 5 to 20',
      'My readiness score: 88% (Strong Start!)',
      'Yes 7, Partly 0, No 1, Not sure 0',
      'Items to review:',
      '- Q2 Records or renewals may be difficult to prove (No)',
      'Area to start with: Company administration',
      'I would like to request my audit readiness review.',
    ]);
  });
  it('says all eight when every answer is Yes', () => {
    expect(whatsappText(calculateResult(all('yes')))).toContain('I answered Yes to all eight.');
  });
});
