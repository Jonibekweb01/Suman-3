import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../entities/user/store';
import { Spinner } from '../../../shared/ui';
import { useAuthModal } from '../model/useAuthModal';

/**
 * Route guard.
 *
 * Waits for the silent-refresh bootstrap before deciding: rendering a redirect
 * while the session is still being restored would bounce every signed-in user
 * to the login screen on a hard reload.
 *
 * Rather than navigating away, it opens the quick-auth modal over the intended
 * destination and remembers it — so signing in continues the original journey
 * instead of dumping the shopper on the home page.
 */
export function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);
  const openAuthModal = useAuthModal((state) => state.open);
  const location = useLocation();

  const needsSignIn = !isBootstrapping && !isAuthenticated;

  useEffect(() => {
    if (needsSignIn) openAuthModal('login', location.pathname + location.search);
  }, [needsSignIn, openAuthModal, location.pathname, location.search]);

  if (isBootstrapping) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-live="polite">
        <Spinner size={28} className="text-muted" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
