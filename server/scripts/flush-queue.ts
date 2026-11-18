/**
 * Replay queued submissions now (ignores backoff timers). Useful after an outage, or from a cron job
 * on platforms without a long-running process.
 *
 *   npm run queue:flush
 */
import { bootstrap } from '../bootstrap';
import { processQueue } from '../services/submit';

const { config, log, hubspot, queue } = bootstrap();
const before = await queue.size();
const res = await processQueue({ hubspot, queue, log, maxAttempts: config.QUEUE_MAX_ATTEMPTS, force: true });
console.log(JSON.stringify({ before, ...res }));
