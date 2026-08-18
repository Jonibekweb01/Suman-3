import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Gender, ProductFilters, ProductSort } from '../../shared/types/product';

const VALID_SORTS: ProductSort[] = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'rating',
  'popular',
];

function readList(params: URLSearchParams, key: string): string[] | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Filter state lives in the URL, not in a store.
 *
 * That makes a filtered grid shareable, bookmarkable and correctly restored by
 * the back button — and it means the page has one source of truth instead of
 * a store that has to be kept in sync with the address bar.
 *
 * `baseFilters` are fixed by the route (the Women page pins `gender: WOMEN`)
 * and cannot be overridden by query params.
 */
export function useProductFilters(baseFilters: Partial<ProductFilters> = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<ProductFilters>(() => {
    const sortParam = searchParams.get('sort') as ProductSort | null;

    return {
      ...baseFilters,
      q: searchParams.get('q') ?? undefined,
      categorySlug: searchParams.get('category') ?? baseFilters.categorySlug,
      gender: (baseFilters.gender ?? (searchParams.get('gender') as Gender | null)) ?? undefined,
      minPrice: readNumber(searchParams, 'minPrice'),
      maxPrice: readNumber(searchParams, 'maxPrice'),
      sizes: readList(searchParams, 'sizes'),
      colors: readList(searchParams, 'colors'),
      brands: readList(searchParams, 'brands'),
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
      // The "Hot deals" nav entries all point at `?featured=true`; without
      // reading it back the link changed the URL and nothing else.
      featured: searchParams.get('featured') === 'true' ? true : baseFilters.featured,
      sort: sortParam && VALID_SORTS.includes(sortParam) ? sortParam : 'newest',
      limit: 24,
    };
    // `baseFilters` is a fresh object literal on every render at the call site;
    // depending on its fields keeps this memo from thrashing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, baseFilters.gender, baseFilters.categorySlug, baseFilters.featured]);

  const setFilter = useCallback(
    (key: string, value: string | string[] | number | boolean | undefined) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          const isEmpty =
            value === undefined ||
            value === '' ||
            value === false ||
            (Array.isArray(value) && value.length === 0);

          if (isEmpty) next.delete(key);
          else next.set(key, Array.isArray(value) ? value.join(',') : String(value));

          return next;
        },
        // `replace` keeps the back button meaningful: ticking five checkboxes
        // should not require five presses to leave the page.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Adds or removes one value from a multi-select filter. */
  const toggleInList = useCallback(
    (key: 'sizes' | 'colors' | 'brands', value: string) => {
      const current = readList(searchParams, key) ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setFilter(key, next);
    },
    [searchParams, setFilter],
  );

  const setPriceRange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (min === undefined) next.delete('minPrice');
          else next.set('minPrice', String(min));
          if (max === undefined) next.delete('maxPrice');
          else next.set('maxPrice', String(max));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams(
      (current) => {
        // The search term survives a filter reset — clearing it too would look
        // like the app forgot what the shopper was looking for.
        const next = new URLSearchParams();
        const q = current.get('q');
        if (q) next.set('q', q);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.sizes?.length) count += filters.sizes.length;
    if (filters.colors?.length) count += filters.colors.length;
    if (filters.brands?.length) count += filters.brands.length;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
    if (filters.inStock) count += 1;
    if (searchParams.get('category')) count += 1;
    return count;
  }, [filters, searchParams]);

  return { filters, setFilter, toggleInList, setPriceRange, clearAll, activeCount };
}
