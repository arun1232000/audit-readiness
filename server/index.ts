import path from 'node:path';
import { createApp } from './app';
import { bootstrap } from './bootstrap';
import { processQueue } from './services/submit';

const { config, log, hubspot, queue } = bootstrap();
const app = createApp({ config, log, hubspot, queue, staticDir: config.SERVE_STATIC ? path.resolve('dist') : undefined });

const server = app.listen(config.PORT, () => {
  log.info({ port: config.PORT, hubspot: hubspot.mode, serveStatic: config.SERVE_STATIC }, 'api listening');
});

// Background retry of anything HubSpot could not take at submit time.
let running = false;
const tick = async () => {
  if (running) return;
  running = true;
  try {
    await processQueue({ hubspot, queue, log, maxAttempts: config.QUEUE_MAX_ATTEMPTS });
  } catch (e) {
    log.error({ err: (e as Error).message }, 'queue tick failed');
  } finally {
    running = false;
  }
};
const timer = config.QUEUE_INTERVAL_MS > 0 ? setInterval(tick, config.QUEUE_INTERVAL_MS) : undefined;
timer?.unref();
void tick();

const shutdown = (signal: string) => {
  log.info({ signal }, 'shutting down');
  if (timer) clearInterval(timer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
