/**
 * Centralized query keys so a mutation can invalidate precisely.
 *
 * `queryKeys.products.all` matches every product query including each filter
 * permutation, which is what you want after a create or delete; the narrower
 * keys are for surgical updates.
 */
export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },

  dashboard: { stats: ['dashboard', 'stats'] as const },

  products: {
    all: ['products'] as const,
    list: (params: unknown) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },

  categories: {
    all: ['categories'] as const,
    flat: ['categories', 'flat'] as const,
  },

  orders: {
    all: ['orders'] as const,
    list: (params: unknown) => ['orders', 'list', params] as const,
  },

  banners: { all: ['banners'] as const },

  users: {
    all: ['users'] as const,
    list: (params: unknown) => ['users', 'list', params] as const,
  },
} as const;
