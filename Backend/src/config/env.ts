import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * A comma-separated list -> trimmed string array.
 */
const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // --- JWT -------------------------------------------------------------
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  /// Short-lived: the client keeps this in memory only.
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  /// Long-lived: HttpOnly + Secure + SameSite cookie.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // --- Cookies ---------------------------------------------------------
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // --- CORS ------------------------------------------------------------
  CORS_ORIGINS: csv.default('http://localhost:5173,http://localhost:5174'),

  // --- Uploads ---------------------------------------------------------
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),

  // --- OTP -------------------------------------------------------------
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_DELIVERY_MODE: z.enum(['log', 'real']).default('log'),

  // --- Notifications ---------------------------------------------------
  ESKIZ_BASE_URL: z.string().url().default('https://notify.eskiz.uz'),
  ESKIZ_EMAIL: z.string().email().optional(),
  ESKIZ_PASSWORD: z.string().optional(),
  ESKIZ_SENDER: z.string().default('4546'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // --- Commerce --------------------------------------------------------
  DELIVERY_FEE: z.coerce.number().int().nonnegative().default(0),
  FREE_DELIVERY_THRESHOLD: z.coerce.number().int().nonnegative().default(0),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Fail fast and loudly: a half-configured server is worse than none.
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
});

export type Env = typeof env;
