import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env';
import { TooManyRequestsError } from '../core/errors';

/**
 * Signed-in users get their own bucket; guests share one per IP. Without this,
 * everyone behind a corporate NAT would exhaust a single limit together.
 */
function keyByUserOrIp(req: Request): string {
  return req.user?.id ?? req.ip ?? 'unknown';
}

function build(options: Partial<Options> & { windowMs: number; limit: number }) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    // Route the rejection through the normal error pipeline so the body shape
    // matches every other error response.
    handler: (_req, _res, next, opts) => {
      next(
        new TooManyRequestsError(
          `Too many requests. Try again in ${Math.ceil(opts.windowMs / 1000)} seconds.`,
        ),
      );
    },
    // Rate limiting a local dev loop just gets in the way.
    skip: () => env.isTest,
    ...options,
  });
}

/** Broad safety net for the whole API surface. */
export const globalLimiter = build({
  windowMs: 60 * 1000,
  limit: 300,
});

/** Login / register / refresh: credential stuffing is the threat here. */
export const authLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

/** OTP send: each message costs money and annoys the recipient. */
export const otpLimiter = build({
  windowMs: 10 * 60 * 1000,
  limit: 4,
});

/** Search autocomplete fires on every keystroke, so the ceiling is higher. */
export const searchLimiter = build({
  windowMs: 60 * 1000,
  limit: 120,
});

/** Writes that create rows a moderator would have to clean up. */
export const writeLimiter = build({
  windowMs: 60 * 1000,
  limit: 40,
});
