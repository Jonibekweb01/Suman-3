import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { Spinner } from '../shared/ui';
import { AdminLayout } from './layouts/AdminLayout';
import { RootShell } from './layouts/RootShell';

/**
 * Route-level code splitting.
 *
 * Login and the dashboard are eager — one of them is always the first screen,
 * and making the entry point wait on a second round trip is pointless. The
 * heavier editors (product form with its variant matrix and uploader) load on
 * demand.
 */
import DashboardPage from '../pages/dashboard/DashboardPage';
import LoginPage from '../pages/login/LoginPage';
import NotFoundPage from '../pages/not-found/NotFoundPage';

const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const ProductFormPage = lazy(() => import('../pages/products/ProductFormPage'));
const CategoriesPage = lazy(() => import('../pages/categories/CategoriesPage'));
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const BannersPage = lazy(() => import('../pages/banners/BannersPage'));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage'));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading">
          <Spinner size={26} className="text-muted" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootShell />,
    children: [
      { path: '/login', element: <LoginPage /> },

      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'products', element: <Lazy><ProductsPage /></Lazy> },
              // `new` is matched by the same param route; the form branches on it.
              { path: 'products/:id', element: <Lazy><ProductFormPage /></Lazy> },
              { path: 'categories', element: <Lazy><CategoriesPage /></Lazy> },
              { path: 'orders', element: <Lazy><OrdersPage /></Lazy> },
              { path: 'banners', element: <Lazy><BannersPage /></Lazy> },
              { path: 'customers', element: <Lazy><CustomersPage /></Lazy> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
