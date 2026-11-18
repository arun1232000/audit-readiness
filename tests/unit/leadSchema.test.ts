import { describe, expect, it } from 'vitest';
import { leadSchema, submissionSchema } from '../../src/schemas/submission';

const valid = { fullName: 'Sam Patel', email: ' Sam@Example.COM ', phone: '+17805551234', consent: true as const };
const msg = (input: unknown, field: string) => {
  const r = leadSchema.safeParse(input);
  if (r.success) return undefined;
  return r.error.issues.find((i) => i.path[0] === field)?.message;
};

describe('leadSchema', () => {
  it('accepts a valid lead and normalises email', () => {
    const r = leadSchema.parse(valid);
    expect(r.email).toBe('sam@example.com');
    expect(r.fullName).toBe('Sam Patel');
  });

  it('gives specific, friendly messages', () => {
    expect(msg({ ...valid, fullName: '' }, 'fullName')).toBe('Please tell us your name.');
    expect(msg({ ...valid, fullName: 'S' }, 'fullName')).toMatch(/full name/);
    expect(msg({ ...valid, fullName: '123' }, 'fullName')).toMatch(/letters/);
    expect(msg({ ...valid, email: '' }, 'email')).toMatch(/send your result/);
    expect(msg({ ...valid, email: 'sam.example.com' }, 'email')).toMatch(/missing @/);
    expect(msg({ ...valid, phone: '' }, 'phone')).toMatch(/phone number/);
    expect(msg({ ...valid, phone: '+1780555' }, 'phone')).toMatch(/incomplete/);
    expect(msg({ ...valid, consent: false }, 'consent')).toMatch(/tick the box/);
  });

  it('requires E.164 phone numbers', () => {
    expect(msg({ ...valid, phone: '780 555 1234' }, 'phone')).toBeDefined();
    expect(msg({ ...valid, phone: '+447911123456' }, 'phone')).toBeUndefined();
  });
});

describe('submissionSchema', () => {
  const answers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'yes', q6: 'yes', q7: 'yes', q8: 'yes' };
  const base = { submissionId: '7f1c3f7e-3c55-4b33-9a1e-2b2f7a1f0a11', lead: valid, answers, powerUnits: '5 to 20', durationMs: 20000 };

  it('accepts a full submission and defaults attribution', () => {
    expect(submissionSchema.parse(base).attribution).toEqual({});
  });
  it('rejects unknown answer values, missing questions and extra keys (no client-sent scores)', () => {
    expect(submissionSchema.safeParse({ ...base, answers: { ...answers, q1: 'maybe' } }).success).toBe(false);
    const { q8: _q8, ...missing } = answers;
    expect(submissionSchema.safeParse({ ...base, answers: missing }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, score: 100 }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, powerUnits: '9000' }).success).toBe(false);
  });
});
