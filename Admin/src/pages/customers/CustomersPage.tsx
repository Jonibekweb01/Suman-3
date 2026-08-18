import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { userApi, type UserListParams } from '../../entities/user/api';
import { queryKeys } from '../../shared/api/queryKeys';
import { useConfirm, useDebouncedValue } from '../../shared/lib/hooks';
import { formatDate, fullName, initialsOf } from '../../shared/lib/utils';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Select,
  useToast,
  type Column,
} from '../../shared/ui';
import type { CustomerRow, Role } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'Customers' },
  { value: 'ADMIN', label: 'Administrators' },
];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 350);

  const params: UserListParams = {
    page,
    limit: 20,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(role ? { role: role as Role } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userApi.list(params),
    placeholderData: (previous) => previous,
  });

  const confirmBlock = useConfirm<CustomerRow>();

  const setBlocked = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      userApi.setBlocked(id, isBlocked),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      confirmBlock.dismiss();
      pushToast(user.isBlocked ? 'Account suspended' : 'Account restored');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const columns: Array<Column<CustomerRow>> = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-ink-soft">
            {initialsOf(row.firstName, row.lastName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(row)}</p>
            <p className="truncate text-[12px] text-muted">{row.email ?? row.phone ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) =>
        row.role === 'ADMIN' ? <Badge tone="info">Admin</Badge> : <span className="text-muted">Customer</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      className: 'text-right',
      hideBelow: 'sm',
      render: (row) => row._count.orders,
    },
    {
      key: 'joined',
      header: 'Joined',
      hideBelow: 'md',
      render: (row) => <span className="text-muted">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.isBlocked ? (
          <Badge tone="danger">Suspended</Badge>
        ) : row.isVerified ? (
          <Badge tone="success">Verified</Badge>
        ) : (
          <Badge tone="warning">Unverified</Badge>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      render: (row) =>
        // Admins cannot be suspended — the API refuses, so do not offer it.
        row.role === 'ADMIN' ? (
          <span className="text-[12px] text-muted">—</span>
        ) : (
          <Button
            variant={row.isBlocked ? 'secondary' : 'ghost'}
            size="sm"
            className={row.isBlocked ? undefined : 'text-danger hover:bg-danger-soft'}
            onClick={() => confirmBlock.request(row)}
          >
            {row.isBlocked ? 'Restore' : 'Suspend'}
          </Button>
        ),
    },
  ];

  const pending = confirmBlock.pending;

  return (
    <>
      <PageHeader title="Customers" description="Everyone with a Suman account." />

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_200px]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email or phone"
          aria-label="Search customers"
        />
        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          options={ROLE_OPTIONS}
          placeholder="All roles"
          aria-label="Filter by role"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No accounts match"
        emptyDescription="Try a different search term or role filter."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={confirmBlock.isOpen}
        onClose={confirmBlock.dismiss}
        onConfirm={() =>
          pending && setBlocked.mutate({ id: pending.id, isBlocked: !pending.isBlocked })
        }
        title={pending?.isBlocked ? 'Restore account' : 'Suspend account'}
        message={
          pending?.isBlocked
            ? `${fullName(pending)} will be able to sign in and order again.`
            : `${fullName(pending)} will be signed out of every device immediately and blocked from signing in. Their order history is kept.`
        }
        confirmLabel={pending?.isBlocked ? 'Restore' : 'Suspend'}
        destructive={!pending?.isBlocked}
        isLoading={setBlocked.isPending}
      />
    </>
  );
}
