import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE_PATH, COOKIE_NAMES } from '../config/constants';
import { env } from '../config/env';

const REFRESH_MAX_AGE_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function baseOptions(): CookieOptions {
  const options: CookieOptions = {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: AUTH_COOKIE_PATH,
  };
  if (env.COOKIE_DOMAIN) options.domain = env.COOKIE_DOMAIN;
  return options;
}

/**
 * The refresh token never touches JS: HttpOnly blocks XSS exfiltration,
 * SameSite + the CSRF cookie below block cross-site use.
 */
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.refreshToken, token, {
    ...baseOptions(),
    httpOnly: true,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

/**
 * Double-submit CSRF token. Readable by JS on purpose — the client copies it
 * into the `x-csrf-token` header, and the server checks that header against
 * this cookie. An attacker on another origin can trigger the request but
 * cannot read the cookie to forge the matching header.
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.csrfToken, token, {
    ...baseOptions(),
    httpOnly: false,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  const options = baseOptions();
  res.clearCookie(COOKIE_NAMES.refreshToken, { ...options, httpOnly: true });
  res.clearCookie(COOKIE_NAMES.csrfToken, { ...options, httpOnly: false });
}
