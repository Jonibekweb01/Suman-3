import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/ui/ProtectedRoute';
import { Spinner } from '../shared/ui';
import { RootLayout } from './layouts/RootLayout';
import NotFoundPage from '../pages/not-found/NotFoundPage';

/**
 * Route-level code splitting.
 *
 * The home page is the overwhelming majority of first visits, so it is bundled
 * eagerly to keep its LCP off a second network round trip. Everything else is
 * lazy — a visitor who never opens checkout should never download it.
 */
import HomePage from '../pages/home/HomePage';

const WomenPage = lazy(() => import('../pages/women/WomenPage'));
const MenPage = lazy(() => import('../pages/men/MenPage'));
const ProductPage = lazy(() => import('../pages/product/ProductPage'));
const CartPage = lazy(() => import('../pages/cart/CartPage'));
const WishlistPage = lazy(() => import('../pages/wishlist/WishlistPage'));
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const AuthPage = lazy(() => import('../pages/auth/AuthPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading page">
      <Spinner size={28} className="text-muted" />
    </div>
  );
}

/** Each lazy route gets its own boundary so one slow chunk cannot blank the shell. */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'women', element: <Lazy><WomenPage /></Lazy> },
      { path: 'men', element: <Lazy><MenPage /></Lazy> },
      { path: 'product/:id', element: <Lazy><ProductPage /></Lazy> },
      { path: 'cart', element: <Lazy><CartPage /></Lazy> },
      { path: 'auth', element: <Lazy><AuthPage /></Lazy> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'wishlist', element: <Lazy><WishlistPage /></Lazy> },
          { path: 'orders', element: <Lazy><OrdersPage /></Lazy> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
