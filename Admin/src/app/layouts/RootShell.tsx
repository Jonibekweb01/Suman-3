import { Outlet } from 'react-router-dom';
import { useAuthBootstrap } from '../../features/auth/useAdminAuth';
import { ToastViewport } from '../../shared/ui';

/**
 * Wraps every route, guarded or not.
 *
 * The bootstrap refresh has to run above the guard: `ProtectedRoute` reads
 * `isBootstrapping` to decide whether to wait or redirect, and the login page
 * needs it too so an already-signed-in admin is bounced straight through
 * instead of being shown the form.
 */
export function RootShell() {
  useAuthBootstrap();

  return (
    <>
      <Outlet />
      <ToastViewport />
    </>
  );
}
