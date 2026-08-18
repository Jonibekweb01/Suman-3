import type { ProductFilters } from '../types/product';

/**
 * Centralized query keys.
 *
 * Scattering key arrays across components makes targeted invalidation
 * guesswork; here `queryKeys.products.all` reliably invalidates every product
 * query including every filter permutation.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => ['products', 'list', filters] as const,
    infinite: (filters: ProductFilters) => ['products', 'infinite', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    related: (id: string) => ['products', 'related', id] as const,
    facets: (filters: ProductFilters) => ['products', 'facets', filters] as const,
    suggest: (term: string) => ['products', 'suggest', term] as const,
  },
  categories: {
    all: ['categories'] as const,
    tree: (gender?: string) => ['categories', 'tree', gender ?? 'all'] as const,
  },
  banners: {
    all: ['banners'] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: ['cart', 'detail'] as const,
    count: ['cart', 'count'] as const,
  },
  wishlist: {
    all: ['wishlist'] as const,
    list: ['wishlist', 'list'] as const,
    count: ['wishlist', 'count'] as const,
    ids: ['wishlist', 'ids'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: ['orders', 'list'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  addresses: {
    all: ['addresses'] as const,
  },
  reviews: {
    byProduct: (productId: string) => ['reviews', productId] as const,
  },
} as const;
