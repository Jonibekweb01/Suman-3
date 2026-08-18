import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/client';
import type { Cart, GuestCartLine } from '../../shared/types/commerce';

export const cartApi = {
  get(): Promise<Cart> {
    return apiGet<Cart>('/cart');
  },

  count(): Promise<{ count: number }> {
    return apiGet<{ count: number }>('/cart/count');
  },

  add(variantId: string, quantity = 1): Promise<Cart> {
    return apiPost<Cart>('/cart/items', { variantId, quantity });
  },

  updateQuantity(variantId: string, quantity: number): Promise<Cart> {
    return apiPatch<Cart>(`/cart/items/${variantId}`, { quantity });
  },

  remove(variantId: string): Promise<Cart> {
    return apiDelete<Cart>(`/cart/items/${variantId}`);
  },

  clear(): Promise<void> {
    return apiDelete<void>('/cart');
  },

  /** Folds the localStorage guest cart into the server cart after sign-in. */
  merge(items: GuestCartLine[]): Promise<Cart> {
    return apiPost<Cart>('/cart/merge', { items });
  },
};
