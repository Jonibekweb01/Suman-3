import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart, useCartCount } from '../../entities/cart/queries';
import { useAuthStore } from '../../entities/user/store';
import { useLogout } from '../../features/auth/model/useAuth';
import { useAuthModal } from '../../features/auth/model/useAuthModal';
import { useCommandPalette } from '../../features/command-palette/useCommandPalette';
import { useVoiceSearch } from '../../features/voice-search/useVoiceSearch';
import { cn } from '../../shared/lib/cn';
import { formatPrice, initialsOf } from '../../shared/lib/format';
import { useClickOutside } from '../../shared/lib/hooks';
import {
  IconBag,
  IconBell,
  IconHeart,
  IconMic,
  IconQr,
  IconSearch,
  IconTruckFast,
  IconUser,
  IconWallet,
} from '../../shared/ui';
import { isScannerSupported, ScannerSheet } from '../scanner/ScannerSheet';
import { SearchBar } from './SearchBar';

const NAV_LINKS = [
  { to: '/', label: 'New in', end: true },
  { to: '/women', label: 'Women' },
  { to: '/men', label: 'Men' },
];

function greetingFor(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Wallet-style widget in the app header.
 *
 * Every number here is real cart state — savings actually applied, or the
 * exact amount still needed for free delivery. There is no loyalty-points
 * field on the API today, and inventing a balance would be a lie the shopper
 * eventually catches at checkout. When points land, this is the one component
 * that changes.
 */
function ValueWidget() {
  const { cart } = useCart();
  const { summary } = cart;

  if (summary.discount > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-chip bg-success-soft px-2.5 py-1.5">
        <IconWallet size={14} className="shrink-0 text-success-deep" />
        <span className="text-xs font-bold text-success-deep tabular-nums">
          −{formatPrice(summary.discount, summary.currency)}
        </span>
      </div>
    );
  }

  if (summary.itemCount > 0 && summary.amountToFreeDelivery > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-chip bg-brand-soft px-2.5 py-1.5">
        <IconTruckFast size={14} className="shrink-0 text-brand-strong" />
        <span className="text-xs font-bold text-brand-strong tabular-nums">
          {formatPrice(summary.amountToFreeDelivery, summary.currency)} to free
        </span>
      </div>
    );
  }

  if (summary.itemCount > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-chip bg-success-soft px-2.5 py-1.5">
        <IconTruckFast size={14} className="shrink-0 text-success-deep" />
        <span className="text-xs font-bold text-success-deep">Free delivery</span>
      </div>
    );
  }

  return null;
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthModal((state) => state.open);
  const logout = useLogout();

  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal('login')}
        aria-label="Sign in"
        className="grid size-11 place-items-center rounded-full text-ink-soft transition-all duration-200 hover:bg-surface-sunken hover:text-ink active:scale-90"
      >
        <IconUser />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid size-11 place-items-center rounded-full transition-transform active:scale-90"
      >
        <span className="grid size-9 place-items-center rounded-field bg-brand text-xs font-bold text-white shadow-e1">
          {initialsOf(user?.firstName, user?.lastName)}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-56 rounded-2xl bg-surface p-1.5 shadow-e3"
          >
            <p className="truncate px-3 py-2 text-xs text-muted">{user?.email ?? user?.phone}</p>
            <hr className="my-1 border-line" />
            <Link
              to="/orders"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-sunken"
            >
              My orders
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-sunken"
            >
              Wishlist
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout.mutate();
              }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Two headers, one component.
 *
 * Below `lg` it is a native app header: greeting, live value widget, and a
 * search field carrying voice and QR capture. Above `lg` it collapses to a
 * slim SaaS utility bar whose search is a ⌘K command trigger, because the
 * three-pane dashboard already exposes navigation in the left rail.
 *
 * The split is CSS, not `useMediaQuery` — a JS breakpoint would flash the
 * wrong header for a frame on first paint.
 */
export function Header() {
  const navigate = useNavigate();
  const cartCount = useCartCount();
  const { cart } = useCart();
  const [condensed, setCondensed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const openPalette = useCommandPalette((state) => state.open);

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const voice = useVoiceSearch((transcript) => {
    if (transcript) navigate(`/?q=${encodeURIComponent(transcript)}`);
  });

  const { scrollY } = useScroll();
  // Collapse the greeting row once scrolling starts so the search field and
  // the cart stay reachable without giving up a third of the viewport.
  useMotionValueEvent(scrollY, 'change', (latest) => setCondensed(latest > 48));

  const scannerAvailable = isScannerSupported();

  return (
    <>
      {/* ---------- Mobile: native app header ---------- */}
      <header
        className={cn(
          'sticky top-0 z-40 lg:hidden',
          'glass-light pt-[env(safe-area-inset-top,0px)]',
          'transition-shadow duration-300',
          condensed && 'shadow-e2',
        )}
      >
        <div className="px-4">
          <motion.div
            animate={{ height: condensed ? 0 : 56, opacity: condensed ? 0 : 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 overflow-hidden"
          >
            <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Suman — home">
              <span className="grid size-9 shrink-0 place-items-center rounded-field bg-brand text-sm font-black text-white shadow-e1">
                S
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] leading-tight font-semibold text-muted">
                  {greetingFor(new Date().getHours())}
                </span>
                <span className="block truncate text-sm leading-tight font-extrabold tracking-tight text-ink">
                  {isAuthenticated && user?.firstName ? user.firstName : 'Welcome to Suman'}
                </span>
              </span>
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <ValueWidget />

              <Link
                to="/orders"
                aria-label="Order activity"
                className="relative grid size-10 place-items-center rounded-full text-ink-soft transition-transform active:scale-90"
              >
                <IconBell size={19} />
                {cart.summary.hasIssues && (
                  <span
                    className="absolute top-2 right-2.5 size-2 rounded-full bg-hot ring-2 ring-white"
                    aria-label="Needs attention"
                  />
                )}
              </Link>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 pb-3">
            <SearchBar
              placeholder="Search Suman…"
              trailing={
                <>
                  {voice.supported && (
                    <button
                      type="button"
                      onClick={() => (voice.listening ? voice.stop() : voice.start())}
                      aria-label={voice.listening ? 'Stop listening' : 'Search by voice'}
                      aria-pressed={voice.listening}
                      className={cn(
                        'relative grid size-9 place-items-center rounded-full transition-all duration-200 active:scale-90',
                        voice.listening
                          ? 'bg-hot text-white shadow-hot'
                          : 'text-muted hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      <IconMic size={17} />
                    </button>
                  )}
                  {scannerAvailable && (
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      aria-label="Scan a QR code"
                      className="grid size-9 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-surface-sunken hover:text-ink active:scale-90"
                    >
                      <IconQr size={17} />
                    </button>
                  )}
                </>
              }
            />
          </div>

          {/* Live transcript — speech must be visible as it is recognised. */}
          <AnimatePresence>
            {voice.listening && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pb-2 text-xs font-semibold text-brand-strong"
                role="status"
              >
                {voice.transcript || 'Listening…'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ---------- Desktop: SaaS utility bar ---------- */}
      <header className="sticky top-0 z-40 hidden border-b border-line bg-canvas/80 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-6 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Suman — home">
            <span className="grid size-9 place-items-center rounded-field bg-brand text-sm font-black text-white shadow-e1">
              S
            </span>
            <span className="text-lg font-extrabold tracking-tight">suman</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-chip px-3.5 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-brand-soft text-brand-strong'
                      : 'text-muted hover:bg-surface-sunken hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* ⌘K trigger rather than a live field: on desktop the palette can
              reach routes and filters, not just product titles. */}
          <button
            type="button"
            onClick={openPalette}
            className="mx-auto flex h-11 w-full max-w-md items-center gap-2.5 rounded-chip bg-surface px-4 text-left shadow-e1 transition-shadow hover:shadow-e2"
          >
            <IconSearch size={17} className="shrink-0 text-muted" />
            <span className="flex-1 truncate text-sm text-muted">Search products, categories…</span>
            <kbd className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-[10px] font-bold text-muted">
              ⌘K
            </kbd>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <ValueWidget />

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="grid size-11 place-items-center rounded-full text-ink-soft transition-all duration-200 hover:bg-surface-sunken hover:text-ink active:scale-90"
            >
              <IconHeart />
            </Link>

            <Link
              to="/cart"
              aria-label={`Bag, ${cartCount} items`}
              className="relative grid size-11 place-items-center rounded-full text-ink-soft transition-all duration-200 hover:bg-surface-sunken hover:text-ink active:scale-90"
            >
              <IconBag />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 500 }}
                    className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-hot px-1 text-[10px] leading-[18px] font-bold text-white shadow-hot"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <AccountMenu />
          </div>
        </div>
      </header>

      <ScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </>
  );
}
