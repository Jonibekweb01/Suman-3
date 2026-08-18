import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty output in dev, structured JSON in production (log shippers want JSON).
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'currentPassword',
      'newPassword',
      'passwordHash',
      // OTP values only — NOT the top-level `code` field, which carries the
      // error taxonomy code and is meant to be readable in logs.
      'devCode',
      'req.body.code',
      '*.password',
      '*.passwordHash',
    ],
    censor: '[redacted]',
  },
});

export type Logger = typeof logger;
