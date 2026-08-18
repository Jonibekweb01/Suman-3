import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { config } from '../config/env';
import { readCsrfToken, tokenStore } from './tokenStore';
import { ApiError, type ApiErrorBody, type ApiSuccess, type Paginated } from './types';

interface RetriableConfig extends InternalAxiosRequestConfig {
  /** Guards against an infinite refresh→401→refresh loop. */
  _retried?: boolean;
  /** Opt out of the refresh dance (used by the auth calls themselves). */
  _skipAuthRefresh?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 20_000,
  // Required for the HttpOnly refresh cookie to travel with requests.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request: attach credentials --------------------------------------------

http.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);

  // Only the cookie-authenticated endpoints check CSRF, but sending the header
  // on every mutation is harmless and keeps the rule in one place.
  const method = request.method?.toUpperCase();
  if (method && method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrfToken();
    if (csrf) request.headers.set('x-csrf-token', csrf);
  }

  return request;
});

// --- Response: transparent token refresh ------------------------------------

/**
 * A single in-flight refresh shared by every waiting request.
 *
 * Without this, a page that fires six queries on mount would trigger six
 * parallel refreshes; because the backend rotates and revokes on each one,
 * five of them would be treated as token reuse and kill the session.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  refreshPromise ??= http
    .post<ApiSuccess<{ accessToken: string }>>(
      '/auth/refresh',
      undefined,
      { _skipAuthRefresh: true } as AxiosRequestConfig,
    )
    .then((response) => {
      const token = response.data.data.accessToken;
      tokenStore.set(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** Notifies the app that the session is gone so the UI can react once. */
const sessionExpiredHandlers = new Set<() => void>();

export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

function normalizeError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.code === 'ECONNABORTED') {
    return new ApiError({
      message: 'The request timed out. Check your connection and try again.',
      code: 'TIMEOUT',
      status: 0,
    });
  }

  if (!error.response) {
    return new ApiError({
      message: 'Cannot reach the server. Check your connection.',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  const body = error.response.data;
  const details = body?.error?.details;

  // Flatten the server's field errors into the shape react-hook-form wants.
  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const item of details as Array<{ field?: string; message?: string }>) {
      if (item.field && item.message) fieldErrors[item.field] = item.message;
    }
  }

  return new ApiError({
    message: body?.error?.message ?? 'Something went wrong. Please try again.',
    code: body?.error?.code ?? 'UNKNOWN_ERROR',
    status: error.response.status,
    fieldErrors,
  });
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const request = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const canRetry =
      status === 401 &&
      request &&
      !request._retried &&
      !request._skipAuthRefresh &&
      // Only an *expired* token is worth refreshing. A malformed token or a
      // revoked session will fail again, so retrying just doubles the latency
      // before the user is shown the login screen.
      (code === 'ACCESS_TOKEN_EXPIRED' || code === 'NO_ACCESS_TOKEN');

    if (canRetry) {
      request._retried = true;
      try {
        const token = await refreshAccessToken();
        request.headers.set('Authorization', `Bearer ${token}`);
        return await http.request(request);
      } catch {
        tokenStore.clear();
        for (const handler of sessionExpiredHandlers) handler();
        return Promise.reject(normalizeError(error));
      }
    }

    if (status === 401 && !request?._skipAuthRefresh) {
      tokenStore.clear();
      for (const handler of sessionExpiredHandlers) handler();
    }

    return Promise.reject(normalizeError(error));
  },
);

// --- Thin typed helpers ------------------------------------------------------
// Callers get `data` directly; the envelope stays an implementation detail.

export async function apiGet<T>(url: string, params?: unknown): Promise<T> {
  const response = await http.get<ApiSuccess<T>>(url, { params: params as never });
  return response.data.data;
}

export async function apiGetPaginated<T>(url: string, params?: unknown): Promise<Paginated<T>> {
  const response = await http.get<ApiSuccess<T[]>>(url, { params: params as never });
  return { items: response.data.data, meta: response.data.meta ?? {} };
}

export async function apiPost<T>(url: string, body?: unknown, options?: AxiosRequestConfig): Promise<T> {
  const response = await http.post<ApiSuccess<T>>(url, body, options);
  return response.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await http.patch<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await http.put<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const response = await http.delete<ApiSuccess<T>>(url);
  return response.data?.data;
}

export { refreshAccessToken };
