import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi, type ProductListParams } from '../../entities/product/api';
import { useFlatCategories } from '../../entities/category/api';
import { queryKeys } from '../../shared/api/queryKeys';
import { useDebouncedValue, useConfirm } from '../../shared/lib/hooks';
import { formatPrice } from '../../shared/lib/utils';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  Select,
  useToast,
  type Column,
} from '../../shared/ui';
import type { ProductRow } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';
import { ProductMobileList } from './ProductMobileList';

const GENDER_OPTIONS = [
  { value: 'WOMEN', label: 'Women' },
  { value: 'MEN', label: 'Men' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'popular', label: 'Best selling' },
];

/** Total units across every variant — the number that matters for restocking. */
function totalStockLabel(product: ProductRow): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (!product.inStock) return { label: 'Out of stock', tone: 'danger' };
  return { label: 'In stock', tone: 'success' };
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);
  const { flat: categories } = useFlatCategories();

  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 350);

  const params: ProductListParams = {
    page,
    limit: 20,
    sort,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(gender ? { gender: gender as ProductListParams['gender'] } : {}),
    ...(categorySlug ? { categorySlug } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productApi.list(params),
    // Keeps the previous page on screen while the next one loads instead of
    // flashing an empty table.
    placeholderData: (previous) => previous,
  });

  const confirmArchive = useConfirm<ProductRow>();

  const archive = useMutation({
    mutationFn: (id: string) => productApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      confirmArchive.dismiss();
      pushToast('Product archived');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  /** Resets to page 1 — staying on page 7 of a new filter shows nothing. */
  function updateFilter(setter: (value: string) => void, value: string): void {
    setter(value);
    setPage(1);
  }

  const columns: Array<Column<ProductRow>> = [
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.images[0]?.url ? (
            <img
              src={row.images[0].url}
              alt=""
              loading="lazy"
              className="size-11 shrink-0 rounded-md border border-line object-cover"
            />
          ) : (
            <div className="size-11 shrink-0 rounded-md bg-sunken" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-[12px] text-muted">
              {row.brand ? `${row.brand} · ` : ''}
              {row.category.name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'For',
      hideBelow: 'lg',
      render: (row) => <span className="capitalize text-muted">{row.gender.toLowerCase()}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      className: 'text-right whitespace-nowrap',
      render: (row) => (
        <div>
          <p>{formatPrice(row.price, row.currency)}</p>
          {row.oldPrice && (
            <p className="text-[12px] text-muted line-through">
              {formatPrice(row.oldPrice, row.currency)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'sold',
      header: 'Sold',
      className: 'text-right',
      hideBelow: 'md',
      render: (row) => row.sold,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => {
        const { label, tone } = totalStockLabel(row);
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'flags',
      header: 'Flags',
      hideBelow: 'lg',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.isFeatured && <Badge tone="info">Featured</Badge>}
          {row.discountPercent > 0 && <Badge tone="warning">−{row.discountPercent}%</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/products/${row.id}`}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Edit ${row.title}`}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <IconEdit size={16} />
          </Link>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              confirmArchive.request(row);
            }}
            aria-label={`Archive ${row.title}`}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Every product, including archived ones."
        actions={
          <Button leftIcon={<IconPlus size={16} />} onClick={() => navigate('/products/new')}>
            New product
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(event) => updateFilter(setSearch, event.target.value)}
          placeholder="Search by title or brand"
          aria-label="Search products"
        />
        <Select
          value={gender}
          onChange={(event) => updateFilter(setGender, event.target.value)}
          options={GENDER_OPTIONS}
          placeholder="All genders"
          aria-label="Filter by gender"
        />
        <Select
          value={categorySlug}
          onChange={(event) => updateFilter(setCategorySlug, event.target.value)}
          options={categories.map((category) => ({ value: category.slug, label: category.label }))}
          placeholder="All categories"
          aria-label="Filter by category"
        />
        <Select
          value={sort}
          onChange={(event) => updateFilter(setSort, event.target.value)}
          options={SORT_OPTIONS}
          aria-label="Sort"
        />
      </div>

      <div className="hidden lg:block">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
          emptyTitle="No products match"
          emptyDescription="Adjust the filters, or add your first product."
          emptyAction={
            <Button leftIcon={<IconPlus size={16} />} onClick={() => navigate('/products/new')}>
              New product
            </Button>
          }
          page={data?.meta.page ?? page}
          totalPages={data?.meta.totalPages}
          total={data?.meta.total}
          onPageChange={setPage}
        />
      </div>

      <ProductMobileList
        products={data?.items ?? []}
        onArchive={confirmArchive.request}
        isLoading={isLoading}
      />

      <ConfirmDialog
        open={confirmArchive.isOpen}
        onClose={confirmArchive.dismiss}
        onConfirm={() => confirmArchive.pending && archive.mutate(confirmArchive.pending.id)}
        title="Archive product"
        message={`"${confirmArchive.pending?.title}" will be hidden from the storefront and removed from every open cart. Order history keeps it, so this can be undone by re-activating the product.`}
        confirmLabel="Archive"
        destructive
        isLoading={archive.isPending}
      />
    </>
  );
}
