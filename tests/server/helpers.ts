import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { loadConfig } from '../../server/config';

export const silentLog = pino({ level: 'silent' });
export const tmpDir = () => mkdtempSync(path.join(tmpdir(), 'audit-test-'));

export const testConfig = (over: Record<string, string> = {}) =>
  loadConfig({ NODE_ENV: 'test', HUBSPOT_MOCK: 'true', LOG_LEVEL: 'silent', QUEUE_INTERVAL_MS: '0', ...over } as NodeJS.ProcessEnv);

export const answers = { q1: 'yes', q2: 'partly', q3: 'no', q4: 'notsure', q5: 'yes', q6: 'yes', q7: 'partly', q8: 'yes' } as const;

export const payload = (over: Record<string, unknown> = {}) => ({
  submissionId: randomUUID(),
  lead: { fullName: 'Sam Patel', email: 'sam@example.com', phone: '+17805551234', consent: true },
  answers,
  powerUnits: '5 to 20',
  attribution: { utm_source: 'google', utm_campaign: 'fleet' },
  durationMs: 30000,
  ...over,
});
