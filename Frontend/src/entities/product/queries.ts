import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../shared/api/queryKeys';
import type { ProductFilters } from '../../shared/types/product';
import { productApi } from './api';

/**
 * Infinite product feed.
 *
 * The first page is fetched without a cursor; every subsequent page uses the
 * `nextCursor` the API returns. Cursor paging (rather than `page + 1`) means
 * a product inserted while the shopper scrolls cannot cause a duplicate or a
 * skipped row.
 */
export function useInfiniteProducts(filters: ProductFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.infinite(filters),
    queryFn: ({ pageParam }) => productApi.list(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled,
    staleTime: 60_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productApi.detail(id!),
    enabled: Boolean(id),
    staleTime: 120_000,
  });
}

export function useRelatedProducts(id: string | undefined, limit = 10) {
  return useQuery({
    queryKey: queryKeys.products.related(id ?? ''),
    queryFn: () => productApi.related(id!, limit),
    enabled: Boolean(id),
    staleTime: 300_000,
  });
}

/**
 * Filter panel bounds. `placeholderData` keeps the previous facets on screen
 * while new ones load, so the price slider does not collapse to 0–0 and jump
 * every time a checkbox is ticked.
 */
export function useProductFacets(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.facets(filters),
    queryFn: () => productApi.facets(filters),
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  });
}

export function useSearchSuggestions(term: string) {
  return useQuery({
    queryKey: queryKeys.products.suggest(term),
    queryFn: () => productApi.suggest(term),
    // One character matches nearly everything and wastes a round trip.
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
  });
}
