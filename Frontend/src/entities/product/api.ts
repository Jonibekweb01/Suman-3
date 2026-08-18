import { apiGet, apiGetPaginated } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type {
  ProductCard,
  ProductDetail,
  ProductFacets,
  ProductFilters,
  SearchSuggestions,
} from '../../shared/types/product';

/**
 * Serializes filters for the query string.
 *
 * Empty values are dropped rather than sent as `?q=` — an empty param would
 * become part of the React Query cache key and split the cache needlessly.
 * Arrays go out comma-joined, which the backend accepts alongside repeats.
 */
export function toQueryParams(filters: ProductFilters, cursor?: string): Record<string, string> {
  const params: Record<string, string> = {};

  const put = (key: string, value: unknown): void => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value.join(',');
      return;
    }
    params[key] = String(value);
  };

  put('q', filters.q);
  put('categorySlug', filters.categorySlug);
  put('categoryId', filters.categoryId);
  put('gender', filters.gender);
  put('minPrice', filters.minPrice);
  put('maxPrice', filters.maxPrice);
  put('sizes', filters.sizes);
  put('colors', filters.colors);
  put('brands', filters.brands);
  put('inStock', filters.inStock);
  put('featured', filters.featured);
  put('minRating', filters.minRating);
  put('sort', filters.sort);
  put('limit', filters.limit);
  put('cursor', cursor);

  return params;
}

export const productApi = {
  list(filters: ProductFilters, cursor?: string): Promise<Paginated<ProductCard>> {
    return apiGetPaginated<ProductCard>('/products', toQueryParams(filters, cursor));
  },

  detail(id: string): Promise<ProductDetail> {
    return apiGet<ProductDetail>(`/products/${id}`);
  },

  detailBySlug(slug: string): Promise<ProductDetail> {
    return apiGet<ProductDetail>(`/products/slug/${slug}`);
  },

  related(id: string, limit = 10): Promise<ProductCard[]> {
    return apiGet<ProductCard[]>(`/products/${id}/related`, { limit });
  },

  facets(filters: ProductFilters): Promise<ProductFacets> {
    return apiGet<ProductFacets>('/products/facets', toQueryParams(filters));
  },

  suggest(q: string, limit = 6): Promise<SearchSuggestions> {
    return apiGet<SearchSuggestions>('/products/suggest', { q, limit });
  },
};
