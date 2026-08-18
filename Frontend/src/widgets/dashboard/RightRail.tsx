import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../entities/cart/queries';
import { useInfiniteProducts } from '../../entities/product/queries';
import { useQuickView } from '../../features/quick-view/useQuickView';
import { dealEndTime } from '../../shared/lib/deals';
import { formatPrice } from '../../shared/lib/format';
import {
  CountdownChip,
  IconBag,
  IconChevronRight,
  IconFlame,
  IconTruckFast,
  Image,
  Skeleton,
} from '../../shared/ui';

/** Sticky bag panel — the desktop equivalent of the mobile checkout bar. */
function CartPanel() {
  const { cart } = useCart();
  const { summary, items } = cart;

  if (summary.itemCount === 0) {
    return (
      <div className="rounded-card bg-surface p-5 text-center shadow-e2">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-sunken text-muted">
          <IconBag size={19} />
        </span>
        <p className="mt-3 text-sm font-bold">Your bag is empty</p>
        <p className="mt-1 text-xs text-muted">Add something you love to see it here.</p>
      </div>
    );
  }

  const goal = summary.freeDeliveryThreshold;
  const needsMore = summary.amountToFreeDelivery > 0;
  // Progress against the actual threshold rather than a derived total, so the
  // bar cannot read 90% while the copy asks for another 200 000 so'm.
  const progress = goal > 0 ? Math.min(100, (summary.subtotal / goal) * 100) : 100;

  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-e2">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
          <IconBag size={16} className="text-brand" />
          Your bag
        </h2>
        <span className="rounded-chip bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-strong tabular-nums">
          {summary.itemCount}
        </span>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto px-2 no-scrollbar">
        {items.slice(0, 6).map((line) => (
          <Link
            key={line.id}
            to={`/product/${line.productId}`}
            className="flex items-center gap-2.5 rounded-2xl p-2 transition-colors hover:bg-surface-sunken"
          >
            <Image
              src={line.image}
              alt={line.title}
              ratio="square"
              className="size-11 shrink-0 rounded-xl"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{line.title}</span>
              <span className="block text-[11px] text-muted">
                {line.size} · {line.color} · ×{line.quantity}
              </span>
            </span>
            <span className="shrink-0 text-[12px] font-bold tabular-nums">
              {formatPrice(line.lineTotal, summary.currency)}
            </span>
          </Link>
        ))}
      </div>

      <div className="space-y-3 px-4 pt-3 pb-4">
        {goal > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <IconTruckFast size={13} className={needsMore ? 'text-brand' : 'text-success'} />
              {needsMore ? (
                <span className="text-muted">
                  <span className="font-bold text-ink tabular-nums">
                    {formatPrice(summary.amountToFreeDelivery, summary.currency)}
                  </span>{' '}
                  to free delivery
                </span>
              ) : (
                <span className="text-success-deep">Free delivery unlocked</span>
              )}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-muted">Subtotal</span>
          <span className="font-display text-lg font-extrabold tracking-tight tabular-nums">
            {formatPrice(summary.subtotal, summary.currency)}
          </span>
        </div>

        <Link
          to="/cart"
          className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-field bg-brand text-sm font-bold text-white shadow-e1 transition-all duration-200 hover:bg-brand-strong hover:shadow-e2 active:scale-95"
        >
          Checkout
          <IconChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}

/** Live deal stream — the "what's expiring" ticker of the command center. */
function DealStream() {
  const { data, isLoading } = useInfiniteProducts({ sort: 'popular', limit: 20 });
  const openQuickView = useQuickView((state) => state.open);

  const deals = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    return items.filter((product) => product.discountPercent > 0).slice(0, 5);
  }, [data]);

  if (!isLoading && deals.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-e2">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="grid size-6 place-items-center rounded-full bg-hot-soft">
          <IconFlame size={13} filled className="text-hot" />
        </span>
        <h2 className="text-sm font-extrabold tracking-tight">Ending soon</h2>
        <span className="pulse-dot ml-auto size-2 rounded-full bg-hot" aria-hidden="true" />
      </div>

      <div className="space-y-0.5 p-2">
        {isLoading
          ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-16 w-full" />)
          : deals.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openQuickView(product.id)}
                className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-surface-sunken"
              >
                <Image
                  src={product.images[0]?.url ?? null}
                  alt={product.title}
                  ratio="square"
                  className="size-12 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{product.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[13px] font-extrabold text-hot tabular-nums">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    <span className="rounded-chip bg-hot-soft px-1.5 py-0.5 text-[10px] font-bold text-hot">
                      −{product.discountPercent}%
                    </span>
                  </span>
                </span>
                <CountdownChip targetMs={dealEndTime(product.id)} tone="amber" className="shrink-0" />
              </button>
            ))}
      </div>
    </section>
  );
}

/**
 * Desktop right rail — bag state and expiring offers, always in view.
 *
 * Appears from `xl` only: squeezed into a 1024px window it would starve the
 * product grid, which is the column that actually sells.
 */
export function RightRail() {
  return (
    <aside className="hidden min-w-0 xl:block" aria-label="Bag and offers">
      <div className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-4 overflow-y-auto overscroll-contain pb-8 no-scrollbar">
        <CartPanel />
        <DealStream />
      </div>
    </aside>
  );
}
