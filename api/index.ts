/**
 * Vercel serverless entry: every /api/* request is rewritten here (see vercel.json) and handled by the
 * same Express app. On serverless the local file queue is ephemeral; set QUEUE_DIR=/tmp and see README
 * for a durable alternative (e.g. a Vercel Cron hitting a flush endpoint backed by a hosted store).
 */
import { createApp } from '../server/app';
import { bootstrap } from '../server/bootstrap';

const deps = bootstrap();
export default createApp(deps);
