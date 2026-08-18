import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { useCategories } from '../../entities/catalog/api';
import { useProductFacets } from '../../entities/product/queries';
import type { useProductFilters } from '../../features/product-filters/useProductFilters';
import { cn } from '../../shared/lib/cn';
import { Badge, Button, IconCheck, IconChevronDown, Skeleton } from '../../shared/ui';
import type { Gender } from '../../shared/types/product';
import { PriceRangeSlider } from './PriceRangeSlider';

type FilterControls = ReturnType<typeof useProductFilters>;

interface FilterPanelProps extends FilterControls {
  gender?: Gender;
}

function Section({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line py-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge !== undefined && badge > 0 && (
            <Badge tone="accent" className="px-1.5 py-0.5 text-[10px]">
              {badge}
            </Badge>
          )}
        </span>
        <IconChevronDown
          size={18}
          className={cn('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FilterPanel({
  filters,
  setFilter,
  toggleInList,
  setPriceRange,
  clearAll,
  activeCount,
  gender,
}: FilterPanelProps) {
  const { data: facets, isLoading } = useProductFacets(filters);
  const { data: categories } = useCategories(gender);

  // Flatten one level: the storefront filters by leaf category, and a nested
  // accordion inside an accordion is more chrome than it is useful.
  const leafCategories = (categories ?? []).flatMap((parent) =>
    parent.children.length > 0 ? parent.children : [parent],
  );

  if (isLoading && !facets) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!facets) return null;

  const priceMin = facets.priceRange.min;
  const priceMax = facets.priceRange.max || priceMin + 1;
  const currentRange: [number, number] = [filters.minPrice ?? priceMin, filters.maxPrice ?? priceMax];

  return (
    <div className="text-ink">
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm text-muted">
          {facets.total} {facets.total === 1 ? 'item' : 'items'}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-bold text-brand-strong underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {leafCategories.length > 0 && (
        <Section title="Category">
          <div className="flex flex-wrap gap-2">
            {leafCategories.map((category) => {
              const active = filters.categorySlug === category.slug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setFilter('category', active ? undefined : category.slug)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-chip px-3.5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95',
                    active
                      ? 'bg-brand text-white shadow-e1'
                      : 'bg-surface-sunken text-ink-soft hover:bg-line hover:text-ink',
                  )}
                >
                  {category.name}
                  <span className={cn('ml-1.5 text-xs', active ? 'text-white/60' : 'text-muted')}>
                    {category.productCount}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {priceMax > priceMin && (
        <Section
          title="Price"
          badge={filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0}
        >
          <PriceRangeSlider
            min={priceMin}
            max={priceMax}
            value={currentRange}
            onChange={([nextMin, nextMax]) =>
              setPriceRange(
                // Sending the untouched bound would pin the filter to today's
                // facet values; omitting it keeps the filter open-ended.
                nextMin === priceMin ? undefined : nextMin,
                nextMax === priceMax ? undefined : nextMax,
              )
            }
          />
        </Section>
      )}

      {facets.sizes.length > 0 && (
        <Section title="Size" badge={filters.sizes?.length ?? 0}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => {
              const active = filters.sizes?.includes(size) ?? false;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleInList('sizes', size)}
                  aria-pressed={active}
                  className={cn(
                    'grid h-11 min-w-11 place-items-center rounded-field px-3 text-sm font-bold transition-all duration-200 active:scale-90',
                    active
                      ? 'bg-brand text-white shadow-e1'
                      : 'bg-surface-sunken text-ink-soft hover:bg-line hover:text-ink',
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets.colors.length > 0 && (
        <Section title="Colour" badge={filters.colors?.length ?? 0}>
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((color) => {
              const active = filters.colors?.includes(color.name) ?? false;
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleInList('colors', color.name)}
                  aria-pressed={active}
                  aria-label={color.name}
                  title={color.name}
                  className={cn(
                    'relative grid size-11 place-items-center rounded-full transition-transform',
                    'hover:scale-105 active:scale-95',
                  )}
                >
                  <span
                    style={{ backgroundColor: color.hex }}
                    className={cn(
                      'grid size-8 place-items-center rounded-full ring-1 ring-inset ring-black/10',
                      active && 'ring-2 ring-brand ring-offset-2 ring-offset-canvas',
                    )}
                  >
                    {active && (
                      <IconCheck
                        size={14}
                        // Pick the tick colour from the swatch's own lightness
                        // so it stays legible on both white and near-black.
                        className={isLightColor(color.hex) ? 'text-ink' : 'text-white'}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets.brands.length > 0 && (
        <Section title="Brand" badge={filters.brands?.length ?? 0} defaultOpen={false}>
          <div className="space-y-1">
            {facets.brands.map((brand) => {
              const active = filters.brands?.includes(brand) ?? false;
              return (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleInList('brands', brand)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  {brand}
                </label>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Availability" defaultOpen={false}>
        <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(event) => setFilter('inStock', event.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          In stock only
        </label>
      </Section>

      {activeCount > 0 && (
        <Button variant="secondary" fullWidth className="mt-5" onClick={clearAll}>
          Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
        </Button>
      )}
    </div>
  );
}

/** Relative luminance test — decides whether a swatch needs dark or light ink. */
function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}
