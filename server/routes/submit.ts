import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Config } from '../config';
import { handleSubmit, type SubmitDeps } from '../services/submit';

export function submitRouter(deps: SubmitDeps & { config: Config }) {
  const r = Router();
  const limiter = rateLimit({
    windowMs: deps.config.RATE_LIMIT_WINDOW_MS,
    limit: deps.config.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ ok: false, code: 'rate_limited', message: 'Too many attempts. Please wait a minute and try again.', requestId: req.id as string });
    },
  });

  r.post('/submit', limiter, async (req, res, next) => {
    try {
      const out = await handleSubmit(req.body, { requestId: req.id as string, ip: req.ip }, deps);
      res.status(out.status).json(out.body);
    } catch (e) {
      next(e);
    }
  });
  return r;
}
