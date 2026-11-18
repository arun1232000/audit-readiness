import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { Config } from './config';
import type { Logger } from './lib/logger';
import { requestIdFor } from './lib/requestId';
import { healthRouter } from './routes/health';
import { submitRouter } from './routes/submit';
import type { HubSpotSync } from './services/hubspot';
import type { FileQueue } from './services/queue';

export interface AppDeps {
  config: Config;
  hubspot: HubSpotSync;
  queue: FileQueue;
  log: Logger;
  staticDir?: string;
}

export function createApp(deps: AppDeps) {
  const { config, log } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', /^\d+$/.test(config.TRUST_PROXY) ? Number(config.TRUST_PROXY) : config.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger: log,
      genReqId: (req, res) => {
        const id = requestIdFor(req);
        res.setHeader('X-Request-Id', id);
        return id;
      },
      // Only method, path and status: no bodies, no query strings, no headers (PII-free logs).
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
          frameSrc: ['https://challenges.cloudflare.com'],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    '/api',
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use('/api', express.json({ limit: '16kb', strict: true }));

  app.use('/api', healthRouter(deps));
  app.use('/api', submitRouter(deps));
  app.use('/api', (_req, res) => res.status(404).json({ ok: false, code: 'server_error', message: 'Not found' }));

  if (deps.staticDir && existsSync(deps.staticDir)) {
    app.use(express.static(deps.staticDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.resolve(deps.staticDir!, 'index.html')));
  }

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    const status = (err as { status?: number; type?: string }).status;
    const type = (err as { type?: string }).type;
    if (type === 'entity.too.large') {
      res.status(413).json({ ok: false, code: 'validation', message: 'That request was too large.', requestId: req.id });
      return;
    }
    if (type === 'entity.parse.failed') {
      res.status(400).json({ ok: false, code: 'validation', message: 'That request was not valid.', requestId: req.id });
      return;
    }
    req.log.error({ err: (err as Error).message, status }, 'unhandled error');
    res.status(500).json({ ok: false, code: 'server_error', message: 'Something went wrong on our side.', requestId: req.id });
  };
  app.use(onError);
  return app;
}
