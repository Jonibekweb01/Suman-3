import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiDelete, apiGet, apiGetPaginated, apiPost } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import type { Paginated } from '../../shared/api/types';
import type { ProductCard } from '../../shared/types/product';
import { useToast } from '../../shared/ui';
import { useAuthStore } from '../../entities/user/store';
import { useAuthModal } from '../auth/model/useAuthModal';

interface WishlistEntry extends ProductCard {
  wishlistItemId: string;
  addedAt: string;
}

export const wishlistApi = {
  list(page = 1, limit = 24): Promise<Paginated<WishlistEntry>> {
    return apiGetPaginated<WishlistEntry>('/wishlist', { page, limit });
  },

  ids(): Promise<{ productIds: string[] }> {
    return apiPost<{ productIds: string[] }>('/wishlist/check', { productIds: [] });
  },

  toggle(productId: string): Promise<{ productId: string; wishlisted: boolean }> {
    return apiPost<{ productId: string; wishlisted: boolean }>(`/wishlist/${productId}/toggle`);
  },

  remove(productId: string): Promise<void> {
    return apiDelete<void>(`/wishlist/${productId}`);
  },

  count(): Promise<{ count: number }> {
    return apiGet<{ count: number }>('/wishlist/count');
  },
};

/**
 * The set of wishlisted product ids, fetched once and reused by every card.
 *
 * A `Set` rather than an array: the grid asks `has(id)` for each of up to 60
 * cards on every render, and a linear scan per card is wasted work.
 */
export function useWishlistIds(): Set<string> {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data } = useQuery({
    queryKey: queryKeys.wishlist.ids,
    queryFn: wishlistApi.ids,
    enabled: isAuthenticated,
    staleTime: 60_000,
    select: (result) => new Set(result.productIds),
  });

  return data ?? new Set<string>();
}

export function useWishlistItems(page = 1) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [...queryKeys.wishlist.list, page],
    queryFn: () => wishlistApi.list(page),
    enabled: isAuthenticated,
  });
}

/**
 * Optimistic wishlist toggle.
 *
 * The heart must flip on the same frame as the tap — waiting for a round trip
 * makes the whole grid feel sluggish. The cache is rolled back if the request
 * fails.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthModal((state) => state.open);
  const pushToast = useToast((state) => state.push);

  const mutation = useMutation({
    mutationFn: wishlistApi.toggle,

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist.ids });
      const previous = queryClient.getQueryData<{ productIds: string[] }>(queryKeys.wishlist.ids);

      queryClient.setQueryData<{ productIds: string[] }>(queryKeys.wishlist.ids, (current) => {
        const ids = current?.productIds ?? [];
        return ids.includes(productId)
          ? { productIds: ids.filter((id) => id !== productId) }
          : { productIds: [...ids, productId] };
      });

      return { previous };
    },

    onError: (error: Error, _productId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.wishlist.ids, context.previous);
      }
      pushToast(error.message, 'error');
    },

    onSuccess: (result) => {
      pushToast(result.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.list });
    },
  });

  const toggle = useCallback(
    (productId: string) => {
      // A guest tapping the heart is a conversion opportunity, not an error:
      // prompt sign-in and keep them on the page.
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }
      mutation.mutate(productId);
    },
    [isAuthenticated, openAuthModal, mutation],
  );

  return { toggle, isPending: mutation.isPending };
}
