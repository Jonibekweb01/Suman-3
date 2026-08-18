import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiGetPaginated, apiPost } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import type { Paginated } from '../../shared/api/types';
import type { Address, AddressInput, Order, PaymentMethod } from '../../shared/types/commerce';
import { useAuthStore } from '../user/store';

export interface CreateOrderPayload {
  addressId?: string;
  address?: AddressInput;
  paymentMethod: PaymentMethod;
  note?: string;
}

export const orderApi = {
  create(payload: CreateOrderPayload): Promise<Order> {
    return apiPost<Order>('/orders', payload);
  },

  list(page = 1, limit = 10): Promise<Paginated<Order>> {
    return apiGetPaginated<Order>('/orders', { page, limit });
  },

  detail(id: string): Promise<Order> {
    return apiGet<Order>(`/orders/${id}`);
  },

  cancel(id: string): Promise<Order> {
    return apiPost<Order>(`/orders/${id}/cancel`);
  },
};

export const addressApi = {
  list(): Promise<Address[]> {
    return apiGet<Address[]>('/users/me/addresses');
  },

  create(payload: AddressInput & { isDefault?: boolean }): Promise<Address> {
    return apiPost<Address>('/users/me/addresses', payload);
  },

  remove(id: string): Promise<void> {
    return apiDelete<void>(`/users/me/addresses/${id}`);
  },
};

export function useAddresses() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.addresses.all,
    queryFn: addressApi.list,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderApi.create,
    onSuccess: () => {
      // Checkout empties the cart and creates an order — both caches are stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
