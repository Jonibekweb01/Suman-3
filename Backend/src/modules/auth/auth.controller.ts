import type { Request, Response } from 'express';
import { COOKIE_NAMES } from '../../config/constants';
import { UnauthorizedError } from '../../core/errors';
import { asyncHandler, created, noContent, ok } from '../../core/http';
import { clearAuthCookies, setCsrfCookie, setRefreshCookie } from '../../utils/cookies';
import * as authService from './auth.service';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RequestOtpInput,
  ResetPasswordInput,
  VerifyOtpInput,
} from './auth.schema';

function sessionContext(req: Request): authService.SessionContext {
  return { userAgent: req.header('user-agent'), ip: req.ip };
}

/**
 * The refresh token goes out as an HttpOnly cookie and is deliberately absent
 * from the JSON body — the client must not be able to read or store it. The
 * access token is returned in the body for the client to keep in memory only.
 */
function respondWithSession(res: Response, session: authService.IssuedSession, status = 200): void {
  setRefreshCookie(res, session.refreshToken);
  setCsrfCookie(res, session.csrfToken);
  ok(
    res,
    { accessToken: session.accessToken, csrfToken: session.csrfToken, user: session.user },
    undefined,
    status,
  );
}

export const register = asyncHandler(async (req, res) => {
  const body = req.body as RegisterInput;
  const result = await authService.register(body);
  created(res, {
    message: 'Verification code sent',
    identifier: result.identifier,
    expiresAt: result.expiresAt,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const body = req.body as VerifyOtpInput;
  const session = await authService.verifyRegistration(body.identifier, body.code, sessionContext(req));
  respondWithSession(res, session);
});

export const requestOtp = asyncHandler(async (req, res) => {
  const body = req.body as RequestOtpInput;
  const result = await authService.requestOtp(body.identifier, body.purpose);
  ok(res, {
    message: 'If the account exists, a verification code has been sent',
    expiresAt: result.expiresAt,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as LoginInput;
  const session = await authService.login(body.identifier, body.password, sessionContext(req));
  respondWithSession(res, session);
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
  if (!token) throw new UnauthorizedError('No active session', 'NO_REFRESH_TOKEN');

  try {
    const session = await authService.refresh(token, sessionContext(req));
    respondWithSession(res, session);
  } catch (error) {
    // The session is unusable — drop the cookies so the client stops retrying
    // with a token that will never work again.
    clearAuthCookies(res);
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
  await authService.logout(token);
  clearAuthCookies(res);
  noContent(res);
});

export const logoutEverywhere = asyncHandler(async (req, res) => {
  await authService.logoutEverywhere(req.user!.id);
  clearAuthCookies(res);
  noContent(res);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.id);
  ok(res, user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body as { identifier: RequestOtpInput['identifier'] };
  const result = await authService.forgotPassword(body.identifier);
  ok(res, {
    message: 'If the account exists, a reset code has been sent',
    expiresAt: result.expiresAt,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const body = req.body as ResetPasswordInput;
  await authService.resetPassword(body.identifier, body.code, body.newPassword);
  clearAuthCookies(res);
  ok(res, { message: 'Password updated. Please sign in.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const body = req.body as ChangePasswordInput;
  await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
  clearAuthCookies(res);
  ok(res, { message: 'Password changed. All other sessions were signed out.' });
});
