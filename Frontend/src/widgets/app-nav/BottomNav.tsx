import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartCount } from '../../entities/cart/queries';
import { cn } from '../../shared/lib/cn';
import { IconBag, IconFlame, IconGrid, IconHeart, IconHome } from '../../shared/ui';
import { CategorySheet } from './CategorySheet';

type TabIcon = ComponentType<{ size?: number; filled?: boolean; className?: string }>;

interface Tab {
  id: string;
  label: string;
  icon: TabIcon;
  /** A tab either navigates or opens a sheet — never both. */
  to?: string;
  action?: 'browse';
  badge?: 'cart';
  match: (pathname: string, search: string) => boolean;
}

const TABS: Tab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: IconHome,
    to: '/',
    match: (pathname, search) => pathname === '/' && !search.includes('featured=true'),
  },
  { id: 'browse', label: 'Browse', icon: IconGrid, action: 'browse', match: () => false },
  {
    id: 'deals',
    label: 'Deals',
    icon: IconFlame,
    to: '/?featured=true',
    match: (_pathname, search) => search.includes('featured=true'),
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: IconHeart,
    to: '/wishlist',
    match: (pathname) => pathname.startsWith('/wishlist'),
  },
  {
    id: 'bag',
    label: 'Bag',
    icon: IconBag,
    to: '/cart',
    badge: 'cart',
    match: (pathname) => pathname.startsWith('/cart'),
  },
];

/**
 * Docked glass bottom navigation — the spine of the mobile app shell.
 *
 * Two details do the heavy lifting. The active pill is a shared `layoutId`, so
 * switching tabs slides one element rather than cross-fading five, which is
 * the difference between "web tabs" and "app tabs". And "Browse" opens a
 * category sheet instead of routing: the taxonomy is a temporary decision
 * surface, and pushing a whole page for it would throw away the shopper's
 * scroll position in the feed behind it.
 *
 * Hidden from `lg` up, where the three-pane dashboard takes over.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useCartCount();
  const [browseOpen, setBrowseOpen] = useState(false);

  const activeId = TABS.find((tab) => tab.match(location.pathname, location.search))?.id ?? 'home';

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 lg:hidden',
          'pb-[env(safe-area-inset-bottom,0px)]',
          'glass-light border-t border-white/40 shadow-[0_-8px_32px_rgb(15_23_42/0.08)]',
        )}
      >
        <ul className="flex items-stretch justify-around px-1.5 pt-1.5 pb-1">
          {TABS.map((tab) => {
            const active = tab.id === activeId || (tab.id === 'browse' && browseOpen);
            const Icon = tab.icon;
            const showBadge = tab.badge === 'cart' && cartCount > 0;

            return (
              <li key={tab.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (tab.action === 'browse') setBrowseOpen(true);
                    else if (tab.to) navigate(tab.to);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2',
                    'transition-transform duration-200 ease-out active:scale-90',
                    active ? 'text-brand-strong' : 'text-muted',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 rounded-2xl bg-brand-soft"
                      transition={{ type: 'spring', damping: 30, stiffness: 420 }}
                    />
                  )}

                  <span className="relative z-10">
                    <Icon size={22} filled={active} />
                    <AnimatePresence>
                      {showBadge && (
                        <motion.span
                          key={cartCount}
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ type: 'spring', damping: 18, stiffness: 500 }}
                          className={cn(
                            'absolute -top-1.5 -right-2.5 grid min-w-[18px] place-items-center rounded-full',
                            'bg-hot px-1 text-[10px] leading-[18px] font-bold text-white shadow-hot',
                          )}
                        >
                          {cartCount > 99 ? '99+' : cartCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>

                  <span
                    className={cn(
                      'relative z-10 text-[10px] leading-none tracking-tight',
                      active ? 'font-bold' : 'font-semibold',
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <CategorySheet open={browseOpen} onClose={() => setBrowseOpen(false)} />
    </>
  );
}
