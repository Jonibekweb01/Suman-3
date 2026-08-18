import { lazy, Suspense, useEffect, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../entities/user/store';
import { useAuthBootstrap } from '../../features/auth/model/useAuth';
import { useAuthModal } from '../../features/auth/model/useAuthModal';
import { useCommandPaletteShortcut } from '../../features/command-palette/useCommandPalette';
import { useRailCollapsed } from '../../shared/lib/railCollapsed';
import { ToastViewport } from '../../shared/ui';
import { BottomNav } from '../../widgets/app-nav/BottomNav';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { LeftRail } from '../../widgets/dashboard/LeftRail';
import { RightRail } from '../../widgets/dashboard/RightRail';
import { Footer } from '../../widgets/footer/Footer';
import { Header } from '../../widgets/header/Header';
import { QuickViewSheet } from '../../widgets/quick-view/QuickViewSheet';
import { SocialProofToast } from '../../widgets/social-proof/SocialProofToast';
import { StickyCartBar } from '../../widgets/sticky-cart/StickyCartBar';

/**
 * The auth modal drags in react-hook-form, zod and every form component —
 * roughly a third of the initial bundle for something most visitors never
 * open. Lazily mounting it moves all of that off the critical path; by the
 * time someone clicks "sign in", the chunk fetches in well under the time it
 * takes the sheet to animate open.
 */
const AuthModal = lazy(() =>
  import('../../features/auth/ui/AuthModal').then((module) => ({ default: module.AuthModal })),
);

/** Restores scroll to the top on navigation — routers do not do this for you. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

/**
 * Sends the shopper to wherever they were headed when a guard interrupted
 * them, once they finish signing in.
 */
function AuthRedirectHandler() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const redirectTo = useAuthModal((state) => state.redirectTo);
  const isOpen = useAuthModal((state) => state.isOpen);

  useEffect(() => {
    if (isAuthenticated && redirectTo && !isOpen) {
      navigate(redirectTo, { replace: true });
      useAuthModal.setState({ redirectTo: null });
    }
  }, [isAuthenticated, redirectTo, isOpen, navigate]);

  return null;
}

/**
 * The app shell.
 *
 * One DOM, two paradigms, split entirely in CSS so neither flashes on first
 * paint: below `lg` the rails collapse away and the docked bottom nav plus
 * sheets carry navigation; from `lg` up the rails appear and the shell becomes
 * a three-pane command center.
 *
 * Every overlay that can be summoned from anywhere — quick view, command
 * palette, toasts, auth — is mounted here exactly once, so no page has to
 * carry its own copy and only one of each can ever be on screen.
 */
export function RootLayout() {
  useAuthBootstrap();
  useCommandPaletteShortcut();
  const railCollapsed = useRailCollapsed((state) => state.collapsed);

  // Mount the modal's chunk only once something has actually asked for it.
  const authModalRequested = useAuthModal((state) => state.isOpen);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <AuthRedirectHandler />

      {/* Keyboard users should not have to tab through the entire nav. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-field focus:bg-ink focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      <div
        style={{ '--rail-w': railCollapsed ? '4.25rem' : '16rem' } as CSSProperties}
        className="dashboard-grid mx-auto max-w-[110rem] flex-1 gap-6 transition-[grid-template-columns] duration-300 ease-out lg:px-6"
      >
        <LeftRail />

        <main id="main" className="min-w-0 pb-nav">
          <Outlet />
        </main>

        <RightRail />
      </div>

      <Footer />

      <BottomNav />
      <StickyCartBar />
      <SocialProofToast />

      <QuickViewSheet />
      <CommandPalette />

      {authModalRequested && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}

      <ToastViewport />
    </div>
  );
}
