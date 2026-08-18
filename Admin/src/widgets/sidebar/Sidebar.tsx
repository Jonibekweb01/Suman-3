import { AnimatePresence, motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../entities/auth/model';
import { useAdminLogout } from '../../features/auth/useAdminAuth';
import { cn, fullName, initialsOf } from '../../shared/lib/utils';
import {
  IconBox,
  IconClose,
  IconDashboard,
  IconExternal,
  IconImage,
  IconLogout,
  IconReceipt,
  IconTag,
  IconUsers,
} from '../../shared/ui';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/products', label: 'Products', icon: IconBox },
  { to: '/categories', label: 'Categories', icon: IconTag },
  { to: '/orders', label: 'Orders', icon: IconReceipt },
  { to: '/banners', label: 'Banners', icon: IconImage },
  { to: '/customers', label: 'Customers', icon: IconUsers },
];

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? 'http://localhost:5173';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAdminLogout();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-line px-5">
        <span className="font-semibold tracking-tight">Suman</span>
        <span className="rounded bg-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Sections">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sunken font-medium text-ink'
                  : 'text-ink-soft hover:bg-canvas hover:text-ink',
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mb-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconExternal size={17} />
          View storefront
        </a>

        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
            {initialsOf(user?.firstName, user?.lastName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{fullName(user)}</span>
            <span className="block truncate text-[12px] text-muted">
              {user?.email ?? user?.phone}
            </span>
          </span>
          <button
            type="button"
            onClick={() => logout.mutate()}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line lg:block">
      <div className="sticky top-0 h-dvh">
        <SidebarContent />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative h-full w-64"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="absolute right-3 top-3.5 grid size-8 place-items-center rounded-md text-muted hover:bg-sunken"
            >
              <IconClose size={16} />
            </button>
            <SidebarContent onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
