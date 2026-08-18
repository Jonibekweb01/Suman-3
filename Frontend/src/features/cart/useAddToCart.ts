import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../shared/api/queryKeys';
import type { ProductDetail, ProductVariant } from '../../shared/types/product';
import { useToast } from '../../shared/ui';
import { cartApi } from '../../entities/cart/api';
import { useGuestCartStore } from '../../entities/cart/guestStore';
import { useAuthStore } from '../../entities/user/store';

/**
 * Adds a variant to the bag, transparently choosing the guest or server cart.
 *
 * Guests are NOT forced to sign in first. Making someone create an account
 * before they can hold an item is the single most reliable way to lose the
 * sale; the local cart is merged server-side the moment they do sign in.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addGuestItem = useGuestCartStore((state) => state.add);
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: async ({
      product,
      variant,
      quantity,
    }: {
      product: ProductDetail;
      variant: ProductVariant;
      quantity: number;
    }) => {
      if (isAuthenticated) {
        return cartApi.add(variant.id, quantity);
      }

      addGuestItem(
        {
          variantId: variant.id,
          productId: product.id,
          title: product.title,
          slug: product.slug,
          image: product.images[0]?.url ?? null,
          color: variant.color,
          colorHex: variant.colorHex,
          size: variant.size,
          sku: variant.sku,
          unitPrice: Math.max(product.price + variant.priceDiff, 0),
          oldUnitPrice: product.oldPrice ? product.oldPrice + variant.priceDiff : null,
          currency: product.currency,
          stock: variant.stock,
        },
        quantity,
      );
      return null;
    },

    onSuccess: (data) => {
      if (data) queryClient.setQueryData(queryKeys.cart.detail, data);
      pushToast('Added to your bag');
    },

    onError: (error: Error) => pushToast(error.message, 'error'),
  });
}
