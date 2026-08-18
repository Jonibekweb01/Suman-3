import { apiGet, apiGetPaginated, apiPatch } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { DashboardStats, Order, OrderStatus, PaymentStatus } from '../../shared/types';

export interface OrderListParams {
  q?: string;
  status?: OrderStatus;
  page: number;
  limit: number;
}

export const orderApi = {
  list(params: OrderListParams): Promise<Paginated<Order>> {
    return apiGetPaginated<Order>('/orders/admin/all', params);
  },

  stats(): Promise<DashboardStats> {
    return apiGet<DashboardStats>('/orders/admin/stats');
  },

  /**
   * The API validates the transition against its own state machine and
   * restocks automatically on cancellation — the client only needs to offer
   * the legal next steps.
   */
  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return apiPatch<Order>(`/orders/${id}/status`, { status });
  },

  updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Order> {
    return apiPatch<Order>(`/orders/${id}/payment`, { paymentStatus });
  },
};
