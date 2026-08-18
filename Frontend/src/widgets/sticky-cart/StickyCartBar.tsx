import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../entities/cart/queries';
import { formatPrice } from '../../shared/lib/format';
import { IconBag, IconChevronRight, IconTruckFast } from '../../shared/ui';

/**
 * Floating checkout bar — mobile only.
 *
 * Kept off `/cart` and `/auth` (a bar promoting "go to your bag" while you are
 * looking at your bag is noise), hidden when the bag is empty, and hidden from
 * `xl` up where the dashboard's right rail already shows the same state
 * permanently. It docks just above the bottom nav rather than over it, so it
 * never covers navigation.
 */
export function StickyCartBar() {
  const location = useLocation();
  const { cart } = useCart();
  const { summary } = cart;

  const hiddenRoute = location.pathname.startsWith('/cart') || location.pathname.startsWith('/auth');
  const visible = !hiddenRoute && summary.itemCount > 0;

  const goal = summary.freeDeliveryThreshold;
  const needsMore = summary.amountToFreeDelivery > 0;
  const progress = goal > 0 ? Math.min(100, (summary.subtotal / goal) * 100) : 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 xl:hidden"
        >
          <div className="glass-dark rounded-[1.5rem] px-4 py-3 shadow-e4">
            {goal > 0 && (
              <div className="mb-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
                  <IconTruckFast
                    size={13}
                    className={needsMore ? 'text-indigo-300' : 'text-emerald-400'}
                  />
                  {needsMore ? (
                    <>
                      <span className="font-bold text-white tabular-nums">
                        {formatPrice(summary.amountToFreeDelivery, summary.currency)}
                      </span>
                      to free delivery
                    </>
                  ) : (
                    <span className="font-bold text-emerald-400">Free delivery unlocked</span>
                  )}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white">
                  <IconBag size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-tight font-bold text-white">
                    {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-xs text-white/65 tabular-nums">
                    {formatPrice(summary.subtotal, summary.currency)}
                  </p>
                </div>
              </div>

              <Link
                to="/cart"
                className="group inline-flex h-11 shrink-0 items-center gap-1 rounded-field bg-brand px-5 text-xs font-bold tracking-wide text-white uppercase shadow-e1 transition-all duration-200 hover:bg-brand-strong active:scale-95"
              >
                Checkout
                <IconChevronRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
