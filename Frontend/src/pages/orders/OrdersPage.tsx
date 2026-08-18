import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orderApi } from '../../entities/order/api';
import { queryKeys } from '../../shared/api/queryKeys';
import { cn } from '../../shared/lib/cn';
import { formatDate, formatPrice } from '../../shared/lib/format';
import { Badge, Button, EmptyState, IconBag, Image, Skeleton, useToast } from '../../shared/ui';
import type { OrderStatus } from '../../shared/types/commerce';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_TONES: Record<OrderStatus, 'neutral' | 'accent' | 'success' | 'outline' | 'danger'> = {
  PENDING: 'outline',
  CONFIRMED: 'neutral',
  PACKED: 'neutral',
  SHIPPED: 'accent',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

/** Only these two states are cancellable by the customer — see the API's flow. */
const CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED'];

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders.list,
    queryFn: () => orderApi.list(1, 20),
  });

  const cancelOrder = useMutation({
    mutationFn: orderApi.cancel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      pushToast('Order cancelled');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const orders = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="mb-8 h-10 w-48" />
        <div className="space-y-4">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<IconBag size={44} />}
          title="No orders yet"
          description="When you place an order it will appear here with its delivery status."
          action={
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-card bg-ink px-8 text-sm font-medium text-canvas transition-colors hover:bg-ink-soft"
            >
              Start shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="mb-8 text-3xl tracking-tight sm:text-4xl">My orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-card border border-line bg-surface p-5">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted">{formatDate(order.createdAt)}</p>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone={STATUS_TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                <p className="text-sm font-medium tabular-nums">
                  {formatPrice(order.total, order.currency)}
                </p>
              </div>
            </header>

            <ul className="flex gap-3 overflow-x-auto py-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex w-56 shrink-0 gap-3">
                  <Image
                    src={item.imageSnapshot}
                    alt={item.titleSnapshot}
                    ratio="portrait"
                    className="w-16 shrink-0"
                    sizes="64px"
                  />
                  <div className="min-w-0 text-sm">
                    <p className="line-clamp-2">{item.titleSnapshot}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.color} · {item.size} · ×{item.quantity}
                    </p>
                    <p className="mt-1 text-xs tabular-nums">
                      {formatPrice(item.total, order.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <footer
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm',
              )}
            >
              <p className="text-muted">
                {order.shipRegion}, {order.shipCity}, {order.shipStreet}
              </p>

              {CANCELLABLE.includes(order.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                  isLoading={cancelOrder.isPending && cancelOrder.variables === order.id}
                  onClick={() => cancelOrder.mutate(order.id)}
                >
                  Cancel order
                </Button>
              )}
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
