import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../entities/auth/model";
import { Spinner } from "../../shared/ui";

export function ProtectedRoute() {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-live="polite">
        <Spinner size={28} className="text-muted" />
      </div>
    );
  }

  if (!isAuthenticated || role !== "ADMIN") {
    // `state.from` lets the login screen send them back where they were going.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
