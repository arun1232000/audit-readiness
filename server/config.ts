import 'dotenv/config';
import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));
const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number.parseInt(v, 10)))
    .pipe(z.number().int().nonnegative());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: int(8787),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    TRUST_PROXY: z.string().default('loopback'),
    SERVE_STATIC: bool(false),

    HUBSPOT_ACCESS_TOKEN: z.string().optional(),
    HUBSPOT_MOCK: bool(false),
    /** Mock mode only: simulate HubSpot being down (exercises the queue). */
    HUBSPOT_MOCK_FAIL: bool(false),
    HUBSPOT_BASE_URL: z.string().url().default('https://api.hubapi.com'),
    HUBSPOT_TIMEOUT_MS: int(10000),
    HUBSPOT_MAX_RETRIES: int(3),
    HUBSPOT_LIFECYCLE_STAGE: z.string().optional(),
    HUBSPOT_LEAD_STATUS: z.string().optional(),

    QUEUE_DIR: z.string().default('./data'),
    QUEUE_INTERVAL_MS: int(30000),
    QUEUE_MAX_ATTEMPTS: int(20),

    RATE_LIMIT_WINDOW_MS: int(15 * 60 * 1000),
    RATE_LIMIT_MAX: int(10),
    MIN_COMPLETION_MS: int(4000),

    TURNSTILE_ENABLED: bool(false),
    TURNSTILE_SECRET_KEY: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (!e.HUBSPOT_MOCK && !e.HUBSPOT_ACCESS_TOKEN && e.NODE_ENV !== 'test') {
      ctx.addIssue({ code: 'custom', path: ['HUBSPOT_ACCESS_TOKEN'], message: 'Set HUBSPOT_ACCESS_TOKEN or HUBSPOT_MOCK=true' });
    }
    if (e.TURNSTILE_ENABLED && !e.TURNSTILE_SECRET_KEY) {
      ctx.addIssue({ code: 'custom', path: ['TURNSTILE_SECRET_KEY'], message: 'Required when TURNSTILE_ENABLED=true' });
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  return parsed.data;
}
