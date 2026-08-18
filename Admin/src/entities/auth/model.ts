import { create } from 'zustand';
import { apiGet, apiPost } from '../../shared/api/client';
import { tokenStore } from '../../shared/api/tokenStore';
import type { AdminUser, Session } from '../../shared/types';

export const authApi = {
  login(identifier: string, password: string): Promise<Session> {
    return apiPost<Session>('/auth/login', { identifier, password });
  },
  me(): Promise<AdminUser> {
    return apiGet<AdminUser>('/auth/me');
  },
  logout(): Promise<void> {
    return apiPost<void>('/auth/logout');
  },
};

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  /** True until the initial silent refresh settles — route guards wait on it. */
  isBootstrapping: boolean;

  setSession: (session: Session) => void;
  setUser: (user: AdminUser | null) => void;
  clear: () => void;
  finishBootstrap: () => void;
}

/**
 * Session state. The access token itself lives in `tokenStore`, outside React,
 * so it never ends up in a devtools snapshot of this store.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setSession: (session) => {
    tokenStore.set(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
  },

  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  clear: () => {
    tokenStore.clear();
    set({ user: null, isAuthenticated: false });
  },

  finishBootstrap: () => set({ isBootstrapping: false }),
}));
