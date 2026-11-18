import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS, type ChoiceId } from '../../src/data/assessment';
import { submissionSchema } from '../../src/schemas/submission';
import { calculateResult } from '../../src/lib/scoring';
import { sendToWeb3Forms, WEB3FORMS_ENDPOINT, web3formsPayload } from '../../src/lib/web3forms';

const ANSWERS: ChoiceId[] = ['yes', 'partly', 'no', 'notsure', 'yes', 'yes', 'partly', 'yes'];
const submission = submissionSchema.parse({
  submissionId: '3f1c2a4e-8b9d-4c1e-9f2a-1b2c3d4e5f60',
  lead: { fullName: 'Sam Patel', email: 'sam.patel@example.com', phone: '+17805551234', consent: true },
  answers: Object.fromEntries(QUESTIONS.map((q, i) => [q.id, ANSWERS[i]])),
  powerUnits: '5 to 20',
  attribution: { utm_source: 'google' },
  durationMs: 60000,
});

describe('web3formsPayload', () => {
  it('carries the key, the lead, the score and every answer', () => {
    const f = web3formsPayload(submission, calculateResult(submission.answers), 'KEY');
    expect(f).toMatchObject({
      access_key: 'KEY',
      name: 'Sam Patel',
      email: 'sam.patel@example.com',
      phone: '+17805551234',
      'Power units': '5 to 20',
      'Readiness score': '63% (Almost There!), 10 of 16 points',
      'Area to start with': 'Drivers',
      'Q3. Hiring and driver files': 'No',
      Source: 'utm_source=google',
    });
    expect(f.subject).toBe('Audit check: Sam Patel, 63% (Almost There!)');
    expect(f['Items to review']).toContain('Driver qualification files may have gaps');
    expect(Object.keys(f).filter((k) => /^Q\d\./.test(k))).toHaveLength(8);
  });
});

describe('sendToWeb3Forms', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts JSON and reports success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendToWeb3Forms({ access_key: 'KEY' })).resolves.toMatchObject({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(WEB3FORMS_ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({ access_key: 'KEY' });
  });

  it('reports a rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, message: 'Invalid key' }), { status: 400 })));
    await expect(sendToWeb3Forms({ access_key: 'bad' })).resolves.toEqual({ ok: false, message: 'Invalid key' });
  });
});
