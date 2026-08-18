import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import type { Banner, Category, CategoryDetail, Gender } from '../../shared/types/product';

export const catalogApi = {
  categories(gender?: Gender): Promise<Category[]> {
    return apiGet<Category[]>('/categories', gender ? { gender, tree: 'true' } : { tree: 'true' });
  },

  categoryBySlug(slug: string): Promise<CategoryDetail> {
    return apiGet<CategoryDetail>(`/categories/${slug}`);
  },

  banners(): Promise<Banner[]> {
    return apiGet<Banner[]>('/banners');
  },
};

export function useCategories(gender?: Gender) {
  return useQuery({
    queryKey: queryKeys.categories.tree(gender),
    queryFn: () => catalogApi.categories(gender),
    // The category tree changes on the order of weeks, not minutes.
    staleTime: 30 * 60_000,
  });
}

export function useBanners() {
  return useQuery({
    queryKey: queryKeys.banners.all,
    queryFn: catalogApi.banners,
    staleTime: 10 * 60_000,
  });
}
