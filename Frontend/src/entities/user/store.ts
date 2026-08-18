import { create } from 'zustand';
import { tokenStore } from '../../shared/api/tokenStore';
import type { Session, User } from '../../shared/types/commerce';

interface AuthState {
  user: User | null;
  /** `true` until the initial silent refresh settles — gates route guards. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;

  setSession: (session: Session) => void;
  setUser: (user: User | null) => void;
  clearSession: () => void;
  finishBootstrap: () => void;
}

/**
 * Auth state, deliberately UI-free.
 *
 * Zustand rather than context: a Capacitor or React Native shell can import
 * this store and the API layer unchanged, because neither touches the DOM.
 * The access token itself is NOT kept here — it lives in `tokenStore`, outside
 * React, so an accidental devtools serialization of the store cannot leak it.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isBootstrapping: true,
  isAuthenticated: false,

  setSession: (session) => {
    tokenStore.set(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
  },

  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  clearSession: () => {
    tokenStore.clear();
    set({ user: null, isAuthenticated: false });
  },

  finishBootstrap: () => set({ isBootstrapping: false }),
}));

/** Selectors — subscribing to a slice avoids re-rendering on unrelated changes. */
export const selectUser = (state: AuthState): User | null => state.user;
export const selectIsAuthenticated = (state: AuthState): boolean => state.isAuthenticated;
export const selectIsAdmin = (state: AuthState): boolean => state.user?.role === 'ADMIN';
