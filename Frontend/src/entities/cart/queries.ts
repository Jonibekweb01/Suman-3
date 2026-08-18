import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../shared/api/queryKeys';
import type { Cart } from '../../shared/types/commerce';
import { useToast } from '../../shared/ui';
import { useAuthStore } from '../user/store';
import { cartApi } from './api';
import { projectGuestCart, useGuestCartStore } from './guestStore';

/**
 * One cart interface for both audiences.
 *
 * Signed-in shoppers read from the server; guests read from localStorage,
 * projected into the same shape. Every consumer — header badge, cart page,
 * checkout — is written once against this hook and never branches on auth.
 */
export function useCart(): { cart: Cart; isLoading: boolean; isGuest: boolean } {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const guestItems = useGuestCartStore((state) => state.items);

  const query = useQuery({
    queryKey: queryKeys.cart.detail,
    queryFn: cartApi.get,
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  const guestCart = useMemo(() => projectGuestCart(guestItems), [guestItems]);

  if (isAuthenticated) {
    return {
      cart: query.data ?? projectGuestCart([]),
      isLoading: query.isLoading,
      isGuest: false,
    };
  }

  return { cart: guestCart, isLoading: false, isGuest: true };
}

export function useCartCount(): number {
  const { cart } = useCart();
  return cart.summary.itemCount;
}

// --- Mutations ---------------------------------------------------------------

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setGuestQuantity = useGuestCartStore((state) => state.setQuantity);
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
      if (!isAuthenticated) {
        setGuestQuantity(variantId, quantity);
        return null;
      }
      return cartApi.updateQuantity(variantId, quantity);
    },
    onSuccess: (data) => {
      // The endpoint returns the whole recalculated cart, so we can seed the
      // cache directly instead of triggering another round trip.
      if (data) queryClient.setQueryData(queryKeys.cart.detail, data);
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const removeGuest = useGuestCartStore((state) => state.remove);
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: async (variantId: string) => {
      if (!isAuthenticated) {
        removeGuest(variantId);
        return null;
      }
      return cartApi.remove(variantId);
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(queryKeys.cart.detail, data);
      pushToast('Removed from bag');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearGuest = useGuestCartStore((state) => state.clear);

  return useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        clearGuest();
        return;
      }
      await cartApi.clear();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
