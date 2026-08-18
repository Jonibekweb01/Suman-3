import { useQuery } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import type { Category, Gender } from '../../shared/types';

export interface CategoryPayload {
  name: string;
  slug?: string;
  gender?: Gender | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const categoryApi = {
  tree(): Promise<Category[]> {
    return apiGet<Category[]>('/categories', { tree: 'true', includeInactive: 'true' });
  },

  create(payload: CategoryPayload): Promise<Category> {
    return apiPost<Category>('/categories', payload);
  },

  update(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
    return apiPatch<Category>(`/categories/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return apiDelete<void>(`/categories/${id}`);
  },
};

export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: categoryApi.tree,
    staleTime: 5 * 60_000,
  });
}

export interface FlatCategory {
  id: string;
  name: string;
  /** Depth-prefixed label for a `<select>`: "Women › Dresses". */
  label: string;
  depth: number;
  parentId: string | null;
  productCount: number;
  slug: string;
}

/** Flattens the tree depth-first so it can be rendered in a plain select. */
export function flattenCategories(tree: Category[], depth = 0, prefix = ''): FlatCategory[] {
  return tree.flatMap((node) => {
    const label = prefix ? `${prefix} › ${node.name}` : node.name;
    return [
      {
        id: node.id,
        name: node.name,
        label,
        depth,
        parentId: node.parentId,
        productCount: node.productCount,
        slug: node.slug,
      },
      ...flattenCategories(node.children, depth + 1, label),
    ];
  });
}

export function useFlatCategories() {
  const query = useCategoryTree();
  return {
    ...query,
    flat: query.data ? flattenCategories(query.data) : [],
  };
}
