import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderApi, type OrderListParams } from '../../entities/order/api';
import { queryKeys } from '../../shared/api/queryKeys';
import { useDebouncedValue } from '../../shared/lib/hooks';
import {
  ORDER_STATUSES,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  formatDateTime,
  formatPrice,
  fullName,
} from '../../shared/lib/utils';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
  Select,
  useToast,
  type Column,
} from '../../shared/ui';
import type { Order, OrderStatus, PaymentStatus } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
  value: status,
  label: ORDER_STATUS_LABELS[status],
}));

const PAYMENT_TONES: Record<PaymentStatus, 'neutral' | 'success' | 'warning'> = {
  UNPAID: 'warning',
  PAID: 'success',
  REFUNDED: 'neutral',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);

  // The dashboard links here with `?status=PENDING`, so the filter reads from
  // the URL rather than local state.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const params: OrderListParams = {
    page,
    limit: 20,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(statusFilter ? { status: statusFilter as OrderStatus } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderApi.list(params),
    placeholderData: (previous) => previous,
    // Fulfilment is a live queue — refresh it while the tab is open.
    refetchInterval: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderApi.updateStatus(id, status),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      setSelected(order);
      pushToast(`Order ${order.orderNumber} → ${ORDER_STATUS_LABELS[order.status]}`);
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
      orderApi.updatePaymentStatus(id, paymentStatus),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setSelected(order);
      pushToast('Payment status updated');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const columns: Array<Column<Order>> = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (row) => (
        <div>
          <p className="font-medium">{row.orderNumber}</p>
          <p className="text-[12px] text-muted">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'sm',
      render: (row) => (
        <div>
          <p>{row.shipFullName}</p>
          <p className="text-[12px] text-muted">{row.shipPhone}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      className: 'text-right',
      hideBelow: 'md',
      render: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right whitespace-nowrap',
      render: (row) => formatPrice(row.total, row.currency),
    },
    {
      key: 'payment',
      header: 'Payment',
      hideBelow: 'lg',
      render: (row) => (
        <div className="space-y-1">
          <Badge tone={PAYMENT_TONES[row.paymentStatus]}>{row.paymentStatus.toLowerCase()}</Badge>
          <p className="text-[12px] text-muted">
            {row.paymentMethod === 'CARD' ? 'Card' : 'Cash on delivery'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={ORDER_STATUS_TONES[row.status]}>{ORDER_STATUS_LABELS[row.status]}</Badge>
      ),
    },
  ];

  const nextStatuses = selected ? ORDER_STATUS_FLOW[selected.status] : [];

  return (
    <>
      <PageHeader title="Orders" description="Fulfilment queue, newest first." />

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_200px]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by order number, name or phone"
          aria-label="Search orders"
        />
        <Select
          value={statusFilter}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            if (event.target.value) next.set('status', event.target.value);
            else next.delete('status');
            setSearchParams(next, { replace: true });
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          aria-label="Filter by status"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        onRowClick={setSelected}
        emptyTitle="No orders match"
        emptyDescription="Try a different status filter or search term."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.orderNumber ?? 'Order'}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={ORDER_STATUS_TONES[selected.status]}>
                {ORDER_STATUS_LABELS[selected.status]}
              </Badge>
              <Badge tone={PAYMENT_TONES[selected.paymentStatus]}>
                {selected.paymentStatus.toLowerCase()}
              </Badge>
              <span className="text-[13px] text-muted">
                {selected.paymentMethod === 'CARD' ? 'Card' : 'Cash on delivery'}
              </span>
            </div>

            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Items</h3>
              <ul className="divide-y divide-line rounded-md border border-line">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-2.5">
                    {item.imageSnapshot ? (
                      <img
                        src={item.imageSnapshot}
                        alt=""
                        loading="lazy"
                        className="size-11 shrink-0 rounded border border-line object-cover"
                      />
                    ) : (
                      <span className="size-11 shrink-0 rounded bg-sunken" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.titleSnapshot}</span>
                      <span className="block text-[12px] text-muted">
                        {item.color} · {item.size} · {item.sku}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <span className="block">×{item.quantity}</span>
                      <span className="block text-[12px] text-muted">
                        {formatPrice(item.total, selected.currency)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
              <section>
                <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Delivery</h3>
                <address className="space-y-0.5 text-sm not-italic">
                  <p className="font-medium">{selected.shipFullName}</p>
                  <p className="text-muted">{selected.shipPhone}</p>
                  <p className="text-muted">
                    {selected.shipRegion}, {selected.shipCity}
                  </p>
                  <p className="text-muted">
                    {selected.shipStreet}
                    {selected.shipApartment ? `, ${selected.shipApartment}` : ''}
                  </p>
                  {selected.shipPostalCode && (
                    <p className="text-muted">{selected.shipPostalCode}</p>
                  )}
                </address>
                {selected.note && (
                  <p className="mt-2 rounded-md bg-warning-soft px-2.5 py-2 text-[13px] text-warning">
                    Note: {selected.note}
                  </p>
                )}
                {selected.user && (
                  <p className="mt-2 text-[12px] text-muted">
                    Account: {fullName(selected.user)} · {selected.user.email ?? selected.user.phone}
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Totals</h3>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd>{formatPrice(selected.subtotal, selected.currency)}</dd>
                  </div>
                  {selected.discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Discount</dt>
                      <dd>−{formatPrice(selected.discount, selected.currency)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted">Delivery</dt>
                    <dd>
                      {selected.deliveryFee === 0
                        ? 'Free'
                        : formatPrice(selected.deliveryFee, selected.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                    <dt>Total</dt>
                    <dd>{formatPrice(selected.total, selected.currency)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="border-t border-line pt-4">
              <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Advance this order</h3>

              {nextStatuses.length === 0 ? (
                <p className="text-[13px] text-muted">
                  This order is {ORDER_STATUS_LABELS[selected.status].toLowerCase()} — no further
                  transitions are possible.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      variant={status === 'CANCELLED' ? 'danger' : 'primary'}
                      size="sm"
                      isLoading={updateStatus.isPending && updateStatus.variables?.status === status}
                      onClick={() => updateStatus.mutate({ id: selected.id, status })}
                    >
                      {status === 'CANCELLED' ? 'Cancel order' : `Mark ${ORDER_STATUS_LABELS[status].toLowerCase()}`}
                    </Button>
                  ))}
                </div>
              )}

              {selected.status === 'CANCELLED' && (
                <p className="mt-2 text-[12px] text-muted">
                  Stock was returned to the catalogue automatically when this order was cancelled.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-2">
                <Select
                  value={selected.paymentStatus}
                  onChange={(event) =>
                    updatePayment.mutate({
                      id: selected.id,
                      paymentStatus: event.target.value as PaymentStatus,
                    })
                  }
                  label="Payment status"
                  options={[
                    { value: 'UNPAID', label: 'Unpaid' },
                    { value: 'PAID', label: 'Paid' },
                    { value: 'REFUNDED', label: 'Refunded' },
                  ]}
                  className="w-44"
                />
                {updatePayment.isPending && (
                  <span className="pb-2.5 text-[13px] text-muted">Saving…</span>
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
