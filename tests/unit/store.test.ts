import { describe, expect, it } from 'vitest';
import { sanitizeRestored, useAssessment } from '../../src/store/assessmentStore';

const lead = { fullName: 'A B', email: 'a@b.co', phone: '+17805551234', consent: true as const };
const all = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'yes', q6: 'yes', q7: 'yes', q8: 'yes' } as const;

describe('session restore', () => {
  const fresh = () => useAssessment.getState();

  it('drops unknown answers, resumes at the first unanswered question and reopens the check', () => {
    const s = sanitizeRestored({ step: 'questions', answers: { q1: 'yes', zz: 'yes', q2: 'bogus' as never }, index: 5 }, fresh());
    expect(s.answers).toEqual({ q1: 'yes' });
    expect(s.step).toBe('questions');
    expect(s.index).toBe(1);
    expect(s.restored).toBe(true);
    expect(s.modalOpen).toBe(true);
  });

  it('never skips the power-units tap or the details form', () => {
    expect(sanitizeRestored({ step: 'lead', answers: { ...all }, powerUnits: null }, fresh()).step).toBe('units');
    expect(sanitizeRestored({ step: 'calc', answers: { ...all }, powerUnits: '5 to 20', lead: null }, fresh()).step).toBe('lead');
  });

  it('retries an unconfirmed submission instead of showing results with no outcome', () => {
    const s = sanitizeRestored({ step: 'results', lead, answers: { ...all }, powerUnits: '5 to 20', outcome: null }, fresh());
    expect(s.step).toBe('calc');
  });

  it('starts closed with nothing in progress', () => {
    const s = sanitizeRestored({ answers: {} }, fresh());
    expect(s.modalOpen).toBe(false);
    expect(s.restored).toBe(false);
  });
});
