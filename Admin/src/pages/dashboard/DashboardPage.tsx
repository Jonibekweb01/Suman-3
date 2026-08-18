import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orderApi } from '../../entities/order/api';
import { queryKeys } from '../../shared/api/queryKeys';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  formatDateTime,
  formatPrice,
  formatPriceCompact,
} from '../../shared/lib/utils';
import {
  Badge,
  Button,
  DataTable,
  ErrorBanner,
  IconBox,
  IconClock,
  IconReceipt,
  IconTrend,
  IconUsers,
  IconWallet,
  Skeleton,
  type Column,
} from '../../shared/ui';
import type { DashboardStats } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';
import { DashboardCharts } from '../../widgets/dashboard/DashboardCharts';

type RecentOrder = DashboardStats['recentOrders'][number];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof IconTrend;
  tone?: 'neutral' | 'warning' | 'danger';
  to?: string;
}) {
  const body = (
    <div className="card h-full p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted">{label}</p>
        <Icon
          size={18}
          className={
            tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-muted'
          }
        />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: orderApi.stats,
    // Operational numbers go stale fast; a minute is a fair compromise
    // between freshness and hammering the aggregate query.
    staleTime: 60_000,
  });

  const columns: Array<Column<RecentOrder>> = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    { key: 'customer', header: 'Customer', render: (row) => row.shipFullName, hideBelow: 'sm' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={ORDER_STATUS_TONES[row.status]}>{ORDER_STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      render: (row) => formatPrice(row.total, row.currency),
    },
    {
      key: 'createdAt',
      header: 'Placed',
      hideBelow: 'md',
      render: (row) => <span className="text-muted">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorBanner message={error instanceof Error ? error.message : 'Could not load statistics'} />
        <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>
          Try again
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Trading summary for the last 30 days."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Refresh
          </Button>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Revenue"
            value={formatPriceCompact(data.revenue)}
            hint="Excludes cancelled orders"
            icon={IconWallet}
          />
          <StatCard label="Orders" value={String(data.orders)} hint="Last 30 days" icon={IconTrend} />
          <StatCard
            label="Awaiting action"
            value={String(data.pendingOrders)}
            hint="Pending confirmation"
            icon={IconClock}
            tone={data.pendingOrders > 0 ? 'warning' : 'neutral'}
            to="/orders?status=PENDING"
          />
          <StatCard label="Customers" value={String(data.customers)} icon={IconUsers} to="/customers" />
          <StatCard
            label="Low stock"
            value={String(data.lowStockVariants)}
            hint="Variants with ≤5 left"
            icon={IconBox}
            tone={data.lowStockVariants > 0 ? 'danger' : 'neutral'}
            to="/products"
          />
        </div>
      )}

      <DashboardCharts orders={data?.recentOrders ?? []} />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IconReceipt size={17} className="text-muted" />
            Recent orders
          </h2>
          <Link to="/orders" className="text-[13px] text-brand underline-offset-2 hover:underline">
            View all
          </Link>
        </div>

        <DataTable
          columns={columns}
          rows={data?.recentOrders ?? []}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No orders yet"
          emptyDescription="Orders placed on the storefront will appear here."
        />
      </section>
    </>
  );
}
