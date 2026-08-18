import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors';
import { prisma } from '../core/prisma';
import { verifyAccessToken, type UserRole } from '../utils/jwt';

function readBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Verifies the in-memory access token. Cheap by design: no database round trip
 * on the hot path — revocation is handled by `tokenVersion` inside the token
 * plus the short 15-minute TTL.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required', 'NO_ACCESS_TOKEN'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, tokenVersion: payload.tv };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Same as `authenticate` but never rejects. Used by endpoints that render
 * differently for signed-in users (e.g. product detail marking wishlist state)
 * yet must stay public and cacheable for guests.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, tokenVersion: payload.tv };
  } catch {
    // A stale token on a public route is not an error — treat as a guest.
  }
  next();
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('This action requires elevated privileges'));
      return;
    }
    next();
  };
}

/**
 * Full verification against the database: confirms the account still exists,
 * is not blocked, and that `tokenVersion` still matches. Reserved for
 * high-impact routes (admin writes, password change, checkout) where a
 * 15-minute stale window is unacceptable.
 */
export async function verifyAccountState(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();

    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, tokenVersion: true, isBlocked: true },
    });

    if (!account) throw new UnauthorizedError('Account no longer exists', 'ACCOUNT_MISSING');
    if (account.isBlocked) throw new ForbiddenError('This account has been suspended');
    if (account.tokenVersion !== req.user.tokenVersion) {
      throw new UnauthorizedError('Session has been invalidated', 'TOKEN_REVOKED');
    }

    req.user = { id: account.id, role: account.role, tokenVersion: account.tokenVersion };
    next();
  } catch (error) {
    next(error);
  }
}
