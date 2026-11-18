/**
 * Durable retry queue (JSON-lines file) for submissions HubSpot could not accept right now.
 * - The user still sees their result; the job is retried in the background with backoff.
 * - Jobs are removed on success. After QUEUE_MAX_ATTEMPTS they move to a dead-letter file for manual replay.
 * - Also keeps a small "processed" ledger used for idempotency (same email + submission id => no duplicate note).
 *
 * Note: queued jobs contain the lead's details (needed to replay). The file lives in QUEUE_DIR, which must be
 * private to the server. On serverless platforms the filesystem is ephemeral — see README.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Submission } from '../../src/schemas/submission';

export interface QueueJob {
  key: string;
  submission: Submission;
  requestId: string;
  enqueuedAt: string;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
}

export interface ProcessedRecord {
  key: string;
  at: string;
  contactId: string;
  existingContact: boolean;
}

export const idempotencyKey = (email: string, submissionId: string) =>
  createHash('sha256').update(`${email.trim().toLowerCase()}|${submissionId}`).digest('hex');

/** Backoff schedule for queued jobs: 1m, 2m, 4m ... capped at 1h. */
export const queueBackoffMs = (attempts: number) => Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));

export class FileQueue {
  private lock: Promise<unknown> = Promise.resolve();
  private processed = new Map<string, ProcessedRecord>();
  private loaded = false;
  readonly queueFile: string;
  readonly deadFile: string;
  readonly processedFile: string;

  constructor(dir: string) {
    this.queueFile = path.join(dir, 'hubspot-queue.jsonl');
    this.deadFile = path.join(dir, 'hubspot-dead-letter.jsonl');
    this.processedFile = path.join(dir, 'processed.jsonl');
  }

  /** Serialise all file operations in this process. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn);
    this.lock = run.catch(() => undefined);
    return run;
  }

  private async ensureDir() {
    await fs.mkdir(path.dirname(this.queueFile), { recursive: true, mode: 0o700 });
  }

  private async readLines<T>(file: string): Promise<T[]> {
    try {
      const raw = await fs.readFile(file, 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l) as T];
          } catch {
            return []; // skip a torn line rather than losing the whole queue
          }
        });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
  }

  private async writeAtomic(file: string, rows: unknown[]) {
    await this.ensureDir();
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), { mode: 0o600 });
    await fs.rename(tmp, file);
  }

  private async append(file: string, row: unknown) {
    await this.ensureDir();
    await fs.appendFile(file, JSON.stringify(row) + '\n', { mode: 0o600 });
  }

  async loadProcessed(): Promise<void> {
    if (this.loaded) return;
    const rows = await this.readLines<ProcessedRecord>(this.processedFile);
    rows.forEach((r) => this.processed.set(r.key, r));
    this.loaded = true;
  }

  async getProcessed(key: string): Promise<ProcessedRecord | undefined> {
    await this.loadProcessed();
    return this.processed.get(key);
  }

  async markProcessed(rec: ProcessedRecord): Promise<void> {
    await this.loadProcessed();
    this.processed.set(rec.key, rec);
    // Single O_APPEND write; deliberately outside the lock so a queue handler can call it.
    await this.append(this.processedFile, rec);
  }

  async enqueue(job: Omit<QueueJob, 'attempts' | 'nextAttemptAt' | 'enqueuedAt'> & { lastError?: string }): Promise<void> {
    await this.exclusive(async () => {
      const jobs = await this.readLines<QueueJob>(this.queueFile);
      if (jobs.some((j) => j.key === job.key)) return; // already queued
      jobs.push({ ...job, enqueuedAt: new Date().toISOString(), attempts: 1, nextAttemptAt: Date.now() + queueBackoffMs(1) });
      await this.writeAtomic(this.queueFile, jobs);
    });
  }

  async has(key: string): Promise<boolean> {
    return (await this.list()).some((j) => j.key === key);
  }

  list(): Promise<QueueJob[]> {
    return this.exclusive(() => this.readLines<QueueJob>(this.queueFile));
  }

  async size(): Promise<number> {
    return (await this.list()).length;
  }

  /**
   * Try every due job with `handler`. Success removes it; failure reschedules it; too many failures
   * moves it to the dead-letter file. Runs under the lock so two ticks never overlap.
   */
  async process(
    handler: (job: QueueJob) => Promise<void>,
    { maxAttempts, now = Date.now(), force = false }: { maxAttempts: number; now?: number; force?: boolean },
  ): Promise<{ succeeded: number; failed: number; dead: number; remaining: number }> {
    return this.exclusive(async () => {
      const jobs = await this.readLines<QueueJob>(this.queueFile);
      const keep: QueueJob[] = [];
      let succeeded = 0;
      let failed = 0;
      let dead = 0;
      for (const job of jobs) {
        if (!force && job.nextAttemptAt > now) {
          keep.push(job);
          continue;
        }
        try {
          await handler(job);
          succeeded++;
        } catch (e) {
          const attempts = job.attempts + 1;
          const lastError = e instanceof Error ? e.message.slice(0, 200) : 'error';
          if (attempts >= maxAttempts) {
            dead++;
            await this.append(this.deadFile, { ...job, attempts, lastError, deadAt: new Date().toISOString() });
          } else {
            failed++;
            keep.push({ ...job, attempts, lastError, nextAttemptAt: now + queueBackoffMs(attempts) });
          }
        }
      }
      await this.writeAtomic(this.queueFile, keep);
      return { succeeded, failed, dead, remaining: keep.length };
    });
  }
}
