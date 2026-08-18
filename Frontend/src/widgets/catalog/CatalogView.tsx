import { useMemo, useState } from 'react';
import { useCategories } from '../../entities/catalog/api';
import { useInfiniteProducts } from '../../entities/product/queries';
import { useProductFilters } from '../../features/product-filters/useProductFilters';
import { cn } from '../../shared/lib/cn';
import { useRailFilters } from '../../shared/lib/railSlot';
import { BottomSheet, Button, CategoryPill, IconCheck, IconSliders } from '../../shared/ui';
import type { Gender, ProductSort } from '../../shared/types/product';
import { FilterPanel } from '../filter-panel/FilterPanel';
import { ProductGrid } from '../product-grid/ProductGrid';

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export interface CatalogViewProps {
  gender?: Gender;
  categorySlug?: string;
  title: string;
  description?: string;
}

/**
 * The shared listing experience behind `/`, `/women` and `/men`.
 *
 * Filters have two homes and one implementation. On mobile they open in a
 * bottom sheet over the grid; on desktop the same panel is published into the
 * shell's left rail. Either way the shopper never leaves the results — which
 * is the entire point, since a filter that costs a page load gets used once
 * and then abandoned.
 */
export function CatalogView({ gender, categorySlug, title, description }: CatalogViewProps) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  // Memoized so the object identity is stable — `useProductFilters` depends on
  // it, and a fresh literal each render would invalidate its memo every time.
  const baseFilters = useMemo(() => ({ gender, categorySlug }), [gender, categorySlug]);
  const controls = useProductFilters(baseFilters);
  const { filters, setFilter, clearAll, activeCount } = controls;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteProducts(filters);
  const { data: categories } = useCategories(gender);

  const products = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const searchTerm = filters.q;
  const activeSort = filters.sort ?? 'newest';
  const sortLabel = SORT_OPTIONS.find((option) => option.value === activeSort)?.label ?? 'Newest';

  const pills = useMemo(
    () =>
      (categories ?? []).flatMap((parent) =>
        parent.children.length > 0 ? parent.children : [parent],
      ),
    [categories],
  );

  // Desktop: project the very same panel into the app shell's left rail.
  const railPanel = useMemo(
    () => <FilterPanel {...controls} gender={gender} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters,
      activeCount,
      gender,
      controls.setFilter,
      controls.toggleInList,
      controls.setPriceRange,
      controls.clearAll,
    ],
  );
  useRailFilters(railPanel);

  return (
    <div className="pt-4 pb-12 lg:pt-8">
      <header className="container-page mb-5">
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          {searchTerm ? `“${searchTerm}”` : title}
        </h1>
        {description && !searchTerm && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </header>

      {/* Edge-to-edge category strip — snaps, and never clips a pill's shadow. */}
      {pills.length > 0 && (
        <div className="container-page mb-4">
          <div className="scroll-strip bleed-x gap-2 py-1">
            <CategoryPill
              active={!filters.categorySlug}
              onClick={() => setFilter('category', undefined)}
              className="snap-item"
            >
              All
            </CategoryPill>
            {pills.map((category) => (
              <CategoryPill
                key={category.id}
                active={filters.categorySlug === category.slug}
                onClick={() =>
                  setFilter(
                    'category',
                    filters.categorySlug === category.slug ? undefined : category.slug,
                  )
                }
                count={category.productCount}
                className="snap-item"
              >
                {category.name}
              </CategoryPill>
            ))}
          </div>
        </div>
      )}

      {/* Utility bar: sticks under the header so filters stay one tap away
          through a long scroll. */}
      <div className="sticky top-[3.5rem] z-30 mb-5 lg:top-16">
        <div className="container-page">
          <div className="flex items-center gap-2 rounded-chip bg-canvas/85 py-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-chip px-4 text-sm font-bold',
                'transition-all duration-200 active:scale-95 lg:hidden',
                activeCount > 0
                  ? 'bg-brand text-white shadow-e1'
                  : 'bg-surface text-ink shadow-e1',
              )}
            >
              <IconSliders size={16} />
              Filters
              {activeCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-white/25 text-[10px] tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-4 text-sm font-bold text-ink shadow-none transition-all duration-200 hover:border-line-strong hover:shadow-e1 active:scale-95"
            >
              <span className="text-muted">Sort</span>
              {sortLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="container-page">
        <ProductGrid
          products={products}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={() => void fetchNextPage()}
          onClearFilters={clearAll}
        />
      </div>

      {/* --- Mobile filter sheet --- */}
      <BottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filters"
        maxHeight="full"
        footer={
          <div className="flex gap-3">
            {activeCount > 0 && (
              <Button variant="secondary" size="lg" onClick={clearAll}>
                Clear
              </Button>
            )}
            <Button size="lg" fullWidth onClick={() => setFilterSheetOpen(false)}>
              Show results
            </Button>
          </div>
        }
      >
        <FilterPanel {...controls} gender={gender} />
      </BottomSheet>

      {/* --- Sort sheet: a native <select> cannot be styled or animated, and
          on mobile it hands the shopper an OS picker that breaks the illusion
          the rest of the shell maintains. --- */}
      <BottomSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title="Sort by"
        maxHeight="half"
      >
        <ul className="space-y-1 pt-1">
          {SORT_OPTIONS.map((option) => {
            const active = option.value === activeSort;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    setFilter('sort', option.value);
                    setSortSheetOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-colors',
                    active ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface-sunken',
                  )}
                >
                  {option.label}
                  {active && <IconCheck size={17} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </div>
  );
}
