import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const SAFE = /^[A-Za-z0-9._-]{8,64}$/;
/** Use an upstream X-Request-Id if it looks sane (e.g. from a load balancer), otherwise mint one. */
export function requestIdFor(req: IncomingMessage): string {
  const h = req.headers['x-request-id'];
  const v = Array.isArray(h) ? h[0] : h;
  return v && SAFE.test(v) ? v : randomUUID();
}
