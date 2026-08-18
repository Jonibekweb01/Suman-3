import type { OtpPurpose, Prisma, User } from '@prisma/client';
import { env } from '../../config/env';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../core/errors';
import { logger } from '../../core/logger';
import { prisma } from '../../core/prisma';
import {
  hashToken,
  newTokenFamily,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { compareOtp, generateCsrfToken, generateOtp, hashOtp } from '../../utils/otp';
import { fakeVerifyPassword, hashPassword, verifyPassword } from '../../utils/password';
import { deliverOtp } from '../notification/notification.service';
import type { Identifier } from './auth.schema';

export interface SessionContext {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  createdAt: Date;
}

export const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  isVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function identifierWhere(identifier: Identifier): Prisma.UserWhereUniqueInput {
  return identifier.type === 'email' ? { email: identifier.value } : { phone: identifier.value };
}

// ---------------------------------------------------------------------------
// Session issuing
// ---------------------------------------------------------------------------

/**
 * Mints an access/refresh pair and persists the refresh token's hash.
 *
 * `family` ties every rotation of one login together. Passing an existing
 * family keeps the chain; omitting it starts a new one (a fresh login).
 */
async function issueSession(
  user: Pick<User, 'id' | 'role' | 'tokenVersion'>,
  context: SessionContext,
  family = newTokenFamily(),
): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const { token: refreshToken, expiresAt } = signRefreshToken({ userId: user.id, family });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      family,
      expiresAt,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ip: context.ip ?? null,
    },
  });

  return { accessToken, refreshToken, csrfToken: generateCsrfToken() };
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

/**
 * Issues a one-time code. Any outstanding code for the same
 * identifier+purpose is consumed first, so only the newest one can be
 * redeemed — otherwise a resend would widen the guessing window.
 */
async function issueOtp(
  identifier: Identifier,
  purpose: OtpPurpose,
  userId?: string,
): Promise<{ expiresAt: Date; devCode?: string }> {
  const recentCount = await prisma.otpCode.count({
    where: {
      identifier: identifier.value,
      purpose,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });

  // Second line of defence behind the HTTP rate limiter: that one is keyed by
  // IP, this one by identifier, so rotating IPs does not multiply the codes.
  if (recentCount >= 5) {
    throw new TooManyRequestsError('Too many codes requested. Please wait a few minutes.');
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { identifier: identifier.value, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.otpCode.create({
      data: {
        identifier: identifier.value,
        purpose,
        codeHash: hashOtp(code),
        expiresAt,
        userId: userId ?? null,
      },
    }),
  ]);

  await deliverOtp({
    identifier: identifier.value,
    type: identifier.type,
    code,
    purpose,
    expiresInMinutes: env.OTP_TTL_MINUTES,
  });

  // Echoing the code outside production removes the need for a real SMS
  // gateway while developing. Never reachable in production.
  return env.isProduction ? { expiresAt } : { expiresAt, devCode: code };
}

/** Validates and burns a code. Throws on every failure path. */
async function consumeOtp(identifier: Identifier, purpose: OtpPurpose, code: string): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: { identifier: identifier.value, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw new BadRequestError('No active code. Request a new one.');

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new BadRequestError('This code has expired. Request a new one.');
  }

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new TooManyRequestsError('Too many incorrect attempts. Request a new code.');
  }

  if (!compareOtp(code, record.codeHash)) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new BadRequestError('Incorrect code');
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function register(input: {
  identifier: Identifier;
  password: string;
  firstName: string;
  lastName?: string | undefined;
}): Promise<{ identifier: string; expiresAt: Date; devCode?: string }> {
  const existing = await prisma.user.findUnique({
    where: identifierWhere(input.identifier),
    select: { id: true, isVerified: true },
  });

  if (existing?.isVerified) {
    throw new ConflictError('An account with these credentials already exists');
  }

  const passwordHash = await hashPassword(input.password);

  // An abandoned, never-verified signup should not permanently squat the
  // email/phone — overwrite it instead of failing the new attempt.
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          email: input.identifier.type === 'email' ? input.identifier.value : null,
          phone: input.identifier.type === 'phone' ? input.identifier.value : null,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
        },
        select: { id: true },
      });

  const { expiresAt, devCode } = await issueOtp(input.identifier, 'REGISTER', user.id);

  return devCode !== undefined
    ? { identifier: input.identifier.value, expiresAt, devCode }
    : { identifier: input.identifier.value, expiresAt };
}

export async function verifyRegistration(
  identifier: Identifier,
  code: string,
  context: SessionContext,
): Promise<IssuedSession> {
  await consumeOtp(identifier, 'REGISTER', code);

  const user = await prisma.user.update({
    where: identifierWhere(identifier),
    data: { isVerified: true },
    select: { ...publicUserSelect, tokenVersion: true },
  });

  const tokens = await issueSession(user, context);
  const { tokenVersion: _tokenVersion, ...publicUser } = user;

  return { ...tokens, user: publicUser };
}

export async function login(
  identifier: Identifier,
  password: string,
  context: SessionContext,
): Promise<IssuedSession> {
  const user = await prisma.user.findUnique({
    where: identifierWhere(identifier),
    select: { ...publicUserSelect, tokenVersion: true, passwordHash: true, isBlocked: true },
  });

  if (!user) {
    // Spend the same time as a real bcrypt comparison, then return the same
    // message as a wrong password — neither timing nor copy reveals whether
    // the account exists.
    await fakeVerifyPassword();
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.isBlocked) throw new ForbiddenError('This account has been suspended');

  if (!user.isVerified) {
    throw new ForbiddenError('Account is not verified. Confirm the code sent to you.');
  }

  const {
    tokenVersion: _tokenVersion,
    passwordHash: _passwordHash,
    isBlocked: _isBlocked,
    ...publicUser
  } = user;

  const tokens = await issueSession(
    { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
    context,
  );

  return { ...tokens, user: publicUser };
}

export async function requestOtp(
  identifier: Identifier,
  purpose: OtpPurpose,
): Promise<{ expiresAt: Date; devCode?: string }> {
  const user = await prisma.user.findUnique({
    where: identifierWhere(identifier),
    select: { id: true },
  });

  if (!user && purpose !== 'REGISTER') {
    // Do not confirm whether the identifier is registered. Return a plausible
    // expiry so the client renders the same "code sent" screen either way.
    logger.warn({ purpose }, 'OTP requested for unknown identifier');
    return { expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000) };
  }

  return issueOtp(identifier, purpose, user?.id);
}

/**
 * Rotates the refresh token.
 *
 * Every refresh invalidates the presented token and issues a new one in the
 * same family. If a token that was already rotated comes back, it was stolen
 * (or replayed), so the whole family is revoked and the user must sign in
 * again.
 */
export async function refresh(rawToken: string, context: SessionContext): Promise<IssuedSession> {
  const payload = verifyRefreshToken(rawToken);
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored) {
    // Signature is valid but the hash is unknown: this token was already
    // rotated away, so its whole family is compromised.
    await prisma.refreshToken.updateMany({
      where: { family: payload.fam, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn({ family: payload.fam, userId: payload.sub }, 'Refresh token reuse detected');
    throw new UnauthorizedError('Session expired, please sign in again', 'REFRESH_REUSE_DETECTED');
  }

  if (stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.updateMany({
      where: { family: stored.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Session expired, please sign in again', 'REFRESH_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { ...publicUserSelect, tokenVersion: true, isBlocked: true },
  });

  if (!user) throw new UnauthorizedError('Account no longer exists', 'ACCOUNT_MISSING');
  if (user.isBlocked) throw new ForbiddenError('This account has been suspended');

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSession(
    { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
    context,
    stored.family,
  );

  const { tokenVersion: _tokenVersion, isBlocked: _isBlocked, ...publicUser } = user;
  return { ...tokens, user: publicUser };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { family: true },
  });

  if (!stored) return;

  // Revoke the family, not just this token: a logout should end the session
  // even if a rotation raced with it.
  await prisma.refreshToken.updateMany({
    where: { family: stored.family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** "Sign out of all devices" — kills refresh tokens and every live access token. */
export async function logoutEverywhere(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    }),
  ]);
}

export async function forgotPassword(
  identifier: Identifier,
): Promise<{ expiresAt: Date; devCode?: string }> {
  return requestOtp(identifier, 'RESET_PASSWORD');
}

export async function resetPassword(
  identifier: Identifier,
  code: string,
  newPassword: string,
): Promise<void> {
  await consumeOtp(identifier, 'RESET_PASSWORD', code);

  const user = await prisma.user.findUnique({
    where: identifierWhere(identifier),
    select: { id: true },
  });

  if (!user) throw new NotFoundError('Account');

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // A password reset implies the old one may be known to an attacker;
      // verify the account and invalidate every existing session.
      data: { passwordHash, isVerified: true, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) throw new NotFoundError('Account');

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD');

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
  if (!user) throw new NotFoundError('Account');
  return user;
}

/**
 * Housekeeping for the scheduled job in `server.ts`: expired rows are dead
 * weight and the OTP table in particular grows fast.
 */
export async function purgeExpiredTokens(): Promise<{ tokens: number; codes: number }> {
  const now = new Date();
  const [tokens, codes] = await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
    prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { tokens: tokens.count, codes: codes.count };
}
