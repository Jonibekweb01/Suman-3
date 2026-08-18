import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInfiniteProducts } from '../../entities/product/queries';
import { IconBag } from '../../shared/ui';

const FIRST_NAMES = ['Alex', 'Dilnoza', 'Sardor', 'Malika', 'Jasur', 'Nigora', 'Bekzod', 'Kamila'];
const CITIES = ['Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Namangan', 'Fergana'];
const MINUTES_AGO = [1, 2, 2, 3, 4, 5, 7];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/**
 * Floating social-proof micro-notification.
 *
 * Names and cities are illustrative, but the product referenced is always a
 * real item from the current catalogue — a fabricated purchase claim about a
 * real product is still fabricated, so this reads as a template, not a
 * verified receipt. Swap in a real "recent orders" feed if/when the backend
 * exposes one.
 */
export function SocialProofToast() {
  const location = useLocation();
  const { data } = useInfiniteProducts({ sort: 'popular', limit: 12 }, true);
  const products = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const [visibleIndex, setVisibleIndex] = useState(0);
  const [shown, setShown] = useState(false);

  const hiddenRoute = location.pathname.startsWith('/cart') || location.pathname.startsWith('/auth');

  useEffect(() => {
    if (hiddenRoute || products.length === 0) {
      setShown(false);
      return;
    }

    let cycle = 0;
    let hideTimer: number | undefined;

    const showNext = () => {
      cycle += 1;
      setVisibleIndex(cycle % products.length);
      setShown(true);
      hideTimer = window.setTimeout(() => setShown(false), 5200);
    };

    // First appearance after a short delay so it never competes with the LCP.
    const firstTimer = window.setTimeout(showNext, 4000);
    const interval = window.setInterval(showNext, 11_000);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [hiddenRoute, products.length]);

  const product = products[visibleIndex];
  if (!product) return null;

  const seed = hashString(product.id + String(visibleIndex));
  const name = FIRST_NAMES[seed % FIRST_NAMES.length];
  const city = CITIES[(seed >> 3) % CITIES.length];
  const minutesAgo = MINUTES_AGO[(seed >> 6) % MINUTES_AGO.length];

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -24, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed bottom-5 left-5 z-30 hidden max-w-xs lg:block"
        >
          <Link
            to={`/product/${product.id}`}
            className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 shadow-e3 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success-deep">
              <IconBag size={16} />
              <span className="pulse-dot absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-success" />
            </span>
            <p className="text-xs leading-snug text-ink-soft">
              <span className="font-bold text-ink">
                {name} from {city}
              </span>{' '}
              just bought <span className="font-semibold text-ink">{product.title}</span>
              <span className="block text-[11px] text-muted">{minutesAgo} min ago</span>
            </p>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
