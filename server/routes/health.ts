import { Router } from 'express';
import type { HubSpotSync } from '../services/hubspot';
import type { FileQueue } from '../services/queue';

export function healthRouter({ hubspot, queue }: { hubspot: HubSpotSync; queue: FileQueue }) {
  const r = Router();
  r.get('/health', async (_req, res) => {
    let queued: number | null = null;
    try {
      queued = await queue.size();
    } catch {
      /* report null */
    }
    res.json({ ok: true, hubspot: hubspot.mode, queued, uptime: Math.round(process.uptime()) });
  });
  return r;
}
