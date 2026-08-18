import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/client';
import type { Banner } from '../../shared/types';

export interface BannerPayload {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
}

export const bannerApi = {
  /** Admin view: includes inactive and out-of-window campaigns. */
  list(): Promise<Banner[]> {
    return apiGet<Banner[]>('/banners/admin/all');
  },

  create(payload: BannerPayload): Promise<Banner> {
    return apiPost<Banner>('/banners', payload);
  },

  update(id: string, payload: Partial<BannerPayload>): Promise<Banner> {
    return apiPatch<Banner>(`/banners/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return apiDelete<void>(`/banners/${id}`);
  },
};
