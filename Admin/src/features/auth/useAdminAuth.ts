import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onSessionExpired, refreshAccessToken } from '../../shared/api/client';
import { ApiError } from '../../shared/api/types';
import { useToast } from '../../shared/ui';
import { authApi, useAuthStore } from '../../entities/auth/model';

/**
 * Restores the session on a cold load.
 *
 * The access token is memory-only, so every reload starts signed-out. One
 * silent `/auth/refresh` recovers it from the HttpOnly cookie; failing that,
 * the guard sends the user to the login screen. A failure here is a normal
 * outcome, not an error to surface.
 */
export function useAuthBootstrap(): void {
  const finishBootstrap = useAuthStore((state) => state.finishBootstrap);
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await refreshAccessToken();
        const user = await authApi.me();
        if (cancelled) return;
        useAuthStore.getState().setUser(user);
      } catch {
        if (!cancelled) clear();
      } finally {
        if (!cancelled) finishBootstrap();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clear, finishBootstrap]);

  useEffect(
    () =>
      onSessionExpired(() => {
        useAuthStore.getState().clear();
        // Cached admin data belongs to the session that just ended.
        queryClient.clear();
      }),
    [queryClient],
  );
}

export function useAdminLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const pushToast = useToast((state) => state.push);

  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      authApi.login(identifier, password),

    onSuccess: (session) => {
      // The API happily signs in a customer; this app is not for them. Reject
      // the session client-side rather than showing an empty dashboard whose
      // every request would 403.
      if (session.user.role !== 'ADMIN') {
        pushToast('This account does not have administrator access', 'error');
        throw new ApiError({
          message: 'Administrator access required',
          code: 'FORBIDDEN',
          status: 403,
        });
      }

      setSession(session);
      navigate('/', { replace: true });
    },
  });
}

export function useAdminLogout() {
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logout(),
    // `onSettled`: a failed request must still sign the admin out locally.
    onSettled: () => {
      clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
