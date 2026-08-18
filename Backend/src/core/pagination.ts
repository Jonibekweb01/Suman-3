import { PAGINATION } from '../config/constants';
import type { ApiMeta } from './http';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

export function resolvePage(page: number = 1, limit: number = PAGINATION.defaultLimit): PageParams {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || PAGINATION.defaultLimit, 1), PAGINATION.maxLimit);
  const safePage = Math.max(Math.trunc(page) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function pageMeta(total: number, { page, limit }: PageParams): ApiMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

/**
 * Cursor pagination for the infinite-scroll product grid.
 *
 * Offset pagination degrades badly on deep pages and duplicates rows when new
 * products are inserted mid-scroll; a cursor is stable under both.
 * We over-fetch by one row to learn whether another page exists.
 */
export function takeWithLookahead(limit: number): number {
  return limit + 1;
}

export function sliceCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  if (rows.length <= limit) {
    return { items: rows, nextCursor: null };
  }
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, nextCursor: last ? last.id : null };
}
