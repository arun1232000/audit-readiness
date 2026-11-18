import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../server/app';
import { MockHubSpot } from '../../server/services/hubspot';
import { FileQueue } from '../../server/services/queue';
import { processQueue } from '../../server/services/submit';
import { payload, silentLog, testConfig, tmpDir } from './helpers';

function makeApp(over: Record<string, string> = {}, hubspot = new MockHubSpot()) {
  const dir = tmpDir();
  const queue = new FileQueue(dir);
  const config = testConfig({ QUEUE_DIR: dir, ...over });
  return { app: createApp({ config, hubspot, queue, log: silentLog }), queue, hubspot, dir };
}

describe('GET /api/health', () => {
  it('reports status and mode', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, hubspot: 'mock', queued: 0 });
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });
});

describe('POST /api/submit', () => {
  it('validates, recomputes the score server-side and syncs', async () => {
    const { app, hubspot } = makeApp();
    const res = await request(app).post('/api/submit').send(payload());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, status: 'synced', existingContact: false, result: { percent: 63, bandId: 'almost' } });
    const c = hubspot.contacts.get('sam@example.com')!;
    expect(c.properties.assessment_overall_score).toBe('63');
    expect(c.notes).toHaveLength(1);
  });

  it('rejects client-sent scores and bad payloads with field errors, without leaking internals', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/submit').send({ ...payload(), score: 100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation');
    const bad = await request(app).post('/api/submit').send(payload({ lead: { fullName: '', email: 'x', phone: '1', consent: false } }));
    expect(Object.keys(bad.body.fieldErrors)).toEqual(expect.arrayContaining(['lead.fullName', 'lead.email', 'lead.phone', 'lead.consent']));
    const malformed = await request(app).post('/api/submit').set('Content-Type', 'application/json').send('{oops');
    expect(malformed.status).toBe(400);
    expect(malformed.body.message).not.toMatch(/JSON|Unexpected/);
  });

  it('limits payload size', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/submit').send({ ...payload(), pad: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it('upserts on a repeat email (updates, flags existingContact) and de-duplicates the same submission', async () => {
    const { app, hubspot } = makeApp();
    const first = payload();
    await request(app).post('/api/submit').send(first);
    const again = await request(app).post('/api/submit').send(first);
    expect(again.body.status).toBe('duplicate');
    const second = await request(app).post('/api/submit').send(payload({ answers: { ...first.answers, q3: 'yes' } }));
    expect(second.body).toMatchObject({ status: 'synced', existingContact: true });
    expect(hubspot.contacts.size).toBe(1);
    expect(hubspot.contacts.get('sam@example.com')!.notes).toHaveLength(2);
  });

  it('silently drops honeypot submissions and rejects impossibly fast ones', async () => {
    const { app, hubspot } = makeApp();
    const hp = await request(app).post('/api/submit').send(payload({ website: 'http://spam' }));
    expect(hp.status).toBe(200);
    expect(hubspot.contacts.size).toBe(0);
    const fast = await request(app).post('/api/submit').send(payload({ durationMs: 500 }));
    expect(fast.status).toBe(400);
    expect(fast.body.code).toBe('bot_check');
  });

  it('enforces CORS to the configured origin', async () => {
    const { app } = makeApp({ CORS_ORIGIN: 'https://audit.example.com' });
    const ok = await request(app).options('/api/submit').set('Origin', 'https://audit.example.com').set('Access-Control-Request-Method', 'POST');
    expect(ok.headers['access-control-allow-origin']).toBe('https://audit.example.com');
    const evil = await request(app).options('/api/submit').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits per IP', async () => {
    const { app } = makeApp({ RATE_LIMIT_MAX: '2' });
    await request(app).post('/api/submit').send(payload());
    await request(app).post('/api/submit').send(payload());
    const res = await request(app).post('/api/submit').send(payload());
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('rate_limited');
  });

  it('queues when HubSpot is down, still returns the result, and replays later without duplicates', async () => {
    const down = new MockHubSpot({ fail: true });
    const { app, queue, dir } = makeApp({}, down);
    const p = payload();
    const res = await request(app).post('/api/submit').send(p);
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ ok: true, status: 'queued', result: { percent: 63 } });
    expect(JSON.stringify(res.body)).not.toMatch(/mock outage|503/);
    expect(await queue.size()).toBe(1);
    // A client retry while queued must not enqueue twice.
    await request(app).post('/api/submit').send(p);
    expect(await queue.size()).toBe(1);

    // Still down: job stays, attempts increase.
    let r = await processQueue({ hubspot: down, queue, log: silentLog, maxAttempts: 5, force: true });
    expect(r).toMatchObject({ failed: 1, remaining: 1 });

    // HubSpot recovers.
    const up = new MockHubSpot();
    r = await processQueue({ hubspot: up, queue, log: silentLog, maxAttempts: 5, force: true });
    expect(r).toMatchObject({ succeeded: 1, remaining: 0 });
    expect(up.contacts.get('sam@example.com')!.notes).toHaveLength(1);
    expect(readFileSync(path.join(dir, 'processed.jsonl'), 'utf8')).not.toContain('sam@example.com');
  });

  it('moves a job to the dead-letter file after max attempts', async () => {
    const down = new MockHubSpot({ fail: true });
    const { app, queue, dir } = makeApp({}, down);
    await request(app).post('/api/submit').send(payload());
    await processQueue({ hubspot: down, queue, log: silentLog, maxAttempts: 2, force: true });
    expect(await queue.size()).toBe(0);
    expect(existsSync(path.join(dir, 'hubspot-dead-letter.jsonl'))).toBe(true);
  });

  it('requires a valid Turnstile token when enabled', async () => {
    const { app } = makeApp({ TURNSTILE_ENABLED: 'true', TURNSTILE_SECRET_KEY: 'secret' });
    const res = await request(app).post('/api/submit').send(payload());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('bot_check');
  });
});
