import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAMES, HEADER_NAMES } from '../config/constants';
import { ForbiddenError } from '../core/errors';
import { timingSafeStringEqual } from '../utils/otp';

/**
 * Double-submit cookie CSRF check.
 *
 * Only cookie-authenticated endpoints need it — `/auth/refresh` and
 * `/auth/logout`. Everything else authenticates with a Bearer header, which a
 * cross-site form post cannot set, so it is immune by construction.
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[COOKIE_NAMES.csrfToken] as string | undefined;
  const headerToken = req.header(HEADER_NAMES.csrfToken);

  if (!cookieToken || !headerToken) {
    next(new ForbiddenError('Missing CSRF token'));
    return;
  }

  if (!timingSafeStringEqual(cookieToken, headerToken)) {
    next(new ForbiddenError('CSRF token mismatch'));
    return;
  }

  next();
}
