/** Mirrors the backend's uniform response envelope. */

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  nextCursor?: string | null;
  breakdown?: Record<number, number>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }> | unknown;
    requestId?: string;
  };
}

export interface Paginated<T> {
  items: T[];
  meta: ApiMeta;
}

/**
 * Normalized error thrown by the API client. Every consumer can rely on
 * `code` and `message` existing, whether the failure came from the server,
 * the network, or a timeout.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(params: {
    message: string;
    code: string;
    status: number;
    fieldErrors?: Record<string, string>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors ?? {};
  }

  /** True when the server rejected the payload and named specific fields. */
  get isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }
}
