import { apiGetPaginated, apiPatch } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { CustomerRow, Role } from '../../shared/types';

export interface UserListParams {
  q?: string;
  role?: Role;
  page: number;
  limit: number;
}

export const userApi = {
  list(params: UserListParams): Promise<Paginated<CustomerRow>> {
    return apiGetPaginated<CustomerRow>('/users', params);
  },

  /**
   * Blocking bumps the account's `tokenVersion` server-side, which kills every
   * live access token immediately rather than leaving the user browsing for up
   * to 15 minutes.
   */
  setBlocked(id: string, isBlocked: boolean): Promise<CustomerRow> {
    return apiPatch<CustomerRow>(`/users/${id}/block`, { isBlocked });
  },
};
