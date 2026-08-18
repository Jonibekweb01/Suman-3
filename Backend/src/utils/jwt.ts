import crypto from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../core/errors';

export type UserRole = 'USER' | 'ADMIN';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  /** Mirrors `User.tokenVersion`; a mismatch means the token was invalidated. */
  tv: number;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  /** Rotation family id — shared by every token descended from one login. */
  fam: string;
  /** Random per-token id, makes each rotation's JWT unique. */
  jti: string;
}

const ISSUER = 'suman-api';
const AUDIENCE = 'suman-client';

export function signAccessToken(payload: {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: payload.userId,
  };
  return jwt.sign({ role: payload.role, tv: payload.tokenVersion }, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // Distinct code so the client knows to hit /auth/refresh instead of
      // dumping the user back onto the login screen.
      throw new UnauthorizedError('Access token expired', 'ACCESS_TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token', 'INVALID_ACCESS_TOKEN');
  }
}

export function signRefreshToken(payload: { userId: string; family: string }): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const token = jwt.sign({ fam: payload.family }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: payload.userId,
    jwtid: jti,
  });

  return { token, jti, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired session', 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Refresh tokens are stored hashed. A leaked database dump therefore cannot be
 * replayed against the API.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newTokenFamily(): string {
  return crypto.randomUUID();
}
