import type { DashboardStats, OrderStatus } from '../../shared/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, formatPriceCompact } from '../../shared/lib/utils';
import { Badge } from '../../shared/ui';

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const TONE_CLASS: Record<string, string> = {
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  danger: 'bg-danger',
  neutral: 'bg-line-strong',
};

type RecentOrder = DashboardStats['recentOrders'][number];

function BarChart({ orders }: { orders: RecentOrder[] }) {
  const values = orders.slice(-7).map((order) => order.total);
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3" aria-label="Recent order value chart">
      {values.length === 0 ? (
        <p className="self-center text-sm text-muted">No order data yet.</p>
      ) : (
        values.map((value, index) => (
          <div key={`${value}-${index}`} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="pointer-events-none text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
              {formatPriceCompact(value)}
            </span>
            <div className="flex h-28 w-full items-end rounded-sm bg-sunken px-1">
              <div
                className="w-full rounded-sm bg-brand transition-[height] duration-500 group-hover:bg-brand-hover"
                style={{ height: `${Math.max(10, (value / max) * 100)}%` }}
                title={formatPriceCompact(value)}
              />
            </div>
            <span className="text-[10px] text-muted">#{index + 1}</span>
          </div>
        ))
      )}
    </div>
  );
}

function StatusChart({ orders }: { orders: RecentOrder[] }) {
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  })).filter((item) => item.count > 0);
  const total = Math.max(orders.length, 1);

  return (
    <div className="space-y-3">
      {counts.length === 0 ? (
        <p className="text-sm text-muted">No recent order statuses yet.</p>
      ) : (
        counts.map(({ status, count }) => (
          <div key={status}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
              <Badge tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
              <span className="font-medium tabular-nums text-muted">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-sunken">
              <div
                className={`h-full ${TONE_CLASS[ORDER_STATUS_TONES[status]] ?? 'bg-brand'}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function DashboardCharts({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]" aria-label="Order analytics">
      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Recent order value</h2>
            <p className="mt-0.5 text-[12px] text-muted">Latest orders returned by the dashboard feed</p>
          </div>
          <span className="text-[12px] font-medium text-muted">Last {orders.length}</span>
        </div>
        <BarChart orders={orders} />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Order status</h2>
          <p className="mt-0.5 text-[12px] text-muted">What needs attention right now</p>
        </div>
        <StatusChart orders={orders} />
      </div>
    </section>
  );
}
