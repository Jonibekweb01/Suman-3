import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { onSessionExpired, refreshAccessToken } from '../../../shared/api/client';
import { queryKeys } from '../../../shared/api/queryKeys';
import { useToast } from '../../../shared/ui';
import { cartApi } from '../../../entities/cart/api';
import { useGuestCartStore } from '../../../entities/cart/guestStore';
import { authApi, type RegisterPayload } from '../../../entities/user/api';
import { useAuthStore } from '../../../entities/user/store';
import { useAuthModal } from './useAuthModal';

/**
 * Restores the session on a cold page load.
 *
 * The access token is memory-only by design, so a refresh always starts
 * signed-out. The HttpOnly cookie is the durable half: one silent
 * `/auth/refresh` recovers the session, and a failure simply means "guest" —
 * it is an expected outcome, not an error worth surfacing.
 */
export function useAuthBootstrap(): void {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const finishBootstrap = useAuthStore((state) => state.finishBootstrap);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function restore(): Promise<void> {
      try {
        await refreshAccessToken();
        const user = await authApi.me();
        if (!cancelled) {
          useAuthStore.getState().setUser(user);
          finishBootstrap();
        }
      } catch {
        if (!cancelled) {
          clearSession();
          finishBootstrap();
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession, finishBootstrap]);

  // The interceptor gives up on a session it cannot refresh; mirror that into
  // app state so guarded routes redirect instead of retrying forever.
  useEffect(
    () =>
      onSessionExpired(() => {
        useAuthStore.getState().clearSession();
        queryClient.removeQueries({ queryKey: queryKeys.cart.all });
        queryClient.removeQueries({ queryKey: queryKeys.wishlist.all });
      }),
    [queryClient],
  );
}

/** Shared post-sign-in work: adopt the session and absorb the guest cart. */
function useOnAuthenticated() {
  const setSession = useAuthStore((state) => state.setSession);
  const guestItems = useGuestCartStore((state) => state.items);
  const clearGuestCart = useGuestCartStore((state) => state.clear);
  const queryClient = useQueryClient();

  return useCallback(
    async (session: Parameters<typeof setSession>[0]) => {
      setSession(session);

      if (guestItems.length > 0) {
        try {
          await cartApi.merge(guestItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
          clearGuestCart();
        } catch {
          // A failed merge must not block the sign-in. The local cart stays
          // put and will be retried on the next successful sign-in.
        }
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },
    [setSession, guestItems, clearGuestCart, queryClient],
  );
}

export function useLogin() {
  const onAuthenticated = useOnAuthenticated();
  const closeModal = useAuthModal((state) => state.close);
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      authApi.login(identifier, password),
    onSuccess: async (session) => {
      await onAuthenticated(session);
      closeModal();
      pushToast(`Welcome back, ${session.user.firstName ?? 'friend'}`);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  });
}

export function useVerifyOtp() {
  const onAuthenticated = useOnAuthenticated();
  const closeModal = useAuthModal((state) => state.close);
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: ({ identifier, code }: { identifier: string; code: string }) =>
      authApi.verifyOtp(identifier, code),
    onSuccess: async (session) => {
      await onAuthenticated(session);
      closeModal();
      pushToast('Account confirmed. Welcome to Suman.');
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: () => authApi.logout(),
    // `onSettled`, not `onSuccess`: if the request fails the user still
    // expects to be signed out locally.
    onSettled: () => {
      clearSession();
      queryClient.clear();
      pushToast('Signed out');
    },
  });
}
