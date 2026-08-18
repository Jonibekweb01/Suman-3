import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { Gender, ProductDetail, ProductRow } from '../../shared/types';

export interface ProductListParams {
  q?: string;
  gender?: Gender;
  categorySlug?: string;
  sort?: string;
  page: number;
  limit: number;
}

export interface VariantInput {
  color: string;
  colorHex: string;
  size: string;
  sku?: string;
  stock: number;
  priceDiff: number;
}

export interface ImageInput {
  url: string;
  blurHash?: string;
  alt?: string;
  sortOrder: number;
}

export interface ProductPayload {
  title: string;
  slug?: string;
  description: string;
  brand?: string;
  gender: Gender;
  categoryId: string;
  /** Minor units — the form converts before it gets here. */
  price: number;
  oldPrice?: number | null;
  currency: string;
  isActive: boolean;
  isFeatured: boolean;
  images: ImageInput[];
  variants: VariantInput[];
}

export const productApi = {
  /** Admin listing — includes archived rows the storefront filters out. */
  list(params: ProductListParams): Promise<Paginated<ProductRow>> {
    return apiGetPaginated<ProductRow>('/products/admin/all', params);
  },

  detail(id: string): Promise<ProductDetail> {
    return apiGet<ProductDetail>(`/products/${id}`);
  },

  create(payload: ProductPayload): Promise<ProductDetail> {
    return apiPost<ProductDetail>('/products', payload);
  },

  update(id: string, payload: Partial<ProductPayload>): Promise<ProductDetail> {
    return apiPatch<ProductDetail>(`/products/${id}`, payload);
  },

  /** Soft delete — order history references products, so they are archived. */
  archive(id: string): Promise<void> {
    return apiDelete<void>(`/products/${id}`);
  },

  adjustStock(variantId: string, delta: number): Promise<{ id: string; sku: string; stock: number }> {
    return apiPost<{ id: string; sku: string; stock: number }>('/products/stock/adjust', {
      variantId,
      delta,
    });
  },
};
