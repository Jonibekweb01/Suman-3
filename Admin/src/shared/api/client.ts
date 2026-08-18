import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { readCsrfToken, tokenStore } from './tokenStore';
import { ApiError, type ApiErrorBody, type ApiSuccess, type Paginated } from './types';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  _skipAuthRefresh?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
  timeout: 30_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);

  const method = request.method?.toUpperCase();
  if (method && method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrfToken();
    if (csrf) request.headers.set('x-csrf-token', csrf);
  }

  return request;
});

/**
 * A single shared refresh promise.
 *
 * The dashboard fires half a dozen queries on mount. Without deduplication
 * each expiring token would trigger its own refresh, and because the API
 * rotates refresh tokens with reuse detection, the extras would be treated as
 * a stolen token and revoke the whole session.
 */
let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  refreshPromise ??= http
    .post<ApiSuccess<{ accessToken: string }>>('/auth/refresh', undefined, {
      _skipAuthRefresh: true,
    } as AxiosRequestConfig)
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

const sessionExpiredHandlers = new Set<() => void>();

export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

function normalizeError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.code === 'ECONNABORTED') {
    return new ApiError({ message: 'The request timed out.', code: 'TIMEOUT', status: 0 });
  }

  if (!error.response) {
    return new ApiError({
      message: 'Cannot reach the API. Is the backend running?',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  const body = error.response.data;
  const details = body?.error?.details;

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const item of details as Array<{ field?: string; message?: string }>) {
      if (item.field && item.message) fieldErrors[item.field] = item.message;
    }
  }

  return new ApiError({
    message: body?.error?.message ?? 'Request failed',
    code: body?.error?.code ?? 'UNKNOWN_ERROR',
    status: error.response.status,
    fieldErrors,
    details,
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

// --- Typed helpers -----------------------------------------------------------

export async function apiGet<T>(url: string, params?: unknown): Promise<T> {
  const response = await http.get<ApiSuccess<T>>(url, { params: params as never });
  return response.data.data;
}

export async function apiGetPaginated<T>(url: string, params?: unknown): Promise<Paginated<T>> {
  const response = await http.get<ApiSuccess<T[]>>(url, { params: params as never });
  return { items: response.data.data, meta: response.data.meta ?? {} };
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await http.post<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await http.patch<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const response = await http.delete<ApiSuccess<T>>(url);
  return response.data?.data;
}

/** Multipart upload. Axios sets the boundary itself when given a FormData. */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const response = await http.post<ApiSuccess<T>>(url, formData, {
    headers: { 'Content-Type': undefined },
    timeout: 120_000,
  });
  return response.data.data;
}
