import pino from 'pino';

export function createLogger(level: string, pretty = false) {
  return pino({
    level,
    base: { service: 'audit-api' },
    // Belt and braces: never log raw PII even if an object slips through.
    redact: {
      paths: ['*.email', '*.phone', '*.fullName', 'lead', '*.lead', 'req.headers.authorization', 'req.headers.cookie', '*.token'],
      censor: '[redacted]',
    },
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } } : {}),
  });
}
export type Logger = ReturnType<typeof createLogger>;

/** "sam.patel@example.com" -> "sa***@ex***.com" */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${user.slice(0, 2)}***@${host.slice(0, 2)}***${tld}`;
}
