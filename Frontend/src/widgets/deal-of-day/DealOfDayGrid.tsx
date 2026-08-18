import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteProducts } from '../../entities/product/queries';
import { ProductCardView } from '../../entities/product/ui/ProductCardView';
import { useQuickView } from '../../features/quick-view/useQuickView';
import { useToggleWishlist, useWishlistIds } from '../../features/wishlist/useWishlist';
import { dealEndTime, useCountdown } from '../../shared/lib/deals';
import { IconArrowRight, IconFlame, Skeleton } from '../../shared/ui';

const DEAL_ANCHOR_ID = 'deal-of-the-day';

function DealHeaderCountdown() {
  const targetMs = useMemo(() => dealEndTime(DEAL_ANCHOR_ID), []);
  const parts = useCountdown(targetMs);

  const blocks = [
    { value: parts.hours, label: 'hrs' },
    { value: parts.minutes, label: 'min' },
    { value: parts.seconds, label: 'sec' },
  ];

  return (
    <div className="flex items-center gap-2">
      {blocks.map((block) => (
        <div
          key={block.label}
          className="min-w-14 rounded-2xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/15 ring-inset backdrop-blur-md"
        >
          <span className="block font-display text-xl leading-none font-extrabold text-white tabular-nums">
            {String(block.value).padStart(2, '0')}
          </span>
          <span className="mt-1 block text-[10px] font-semibold tracking-wider text-white/55 uppercase">
            {block.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * "Deal of the Day" band.
 *
 * Inverts to the dark scope so it reads as a distinct event rather than more
 * catalogue — the section is doing a different job from the feed around it,
 * and a colour change communicates that faster than a heading does. Split
 * flip-clock digits rather than a running `HH:MM:SS` string: the seconds
 * block visibly ticking is what makes the deadline feel real.
 */
export function DealOfDayGrid() {
  const { data, isLoading } = useInfiniteProducts({ sort: 'popular', limit: 24 });
  const wishlistIds = useWishlistIds();
  const { toggle } = useToggleWishlist();
  const openQuickView = useQuickView((state) => state.open);

  const deals = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    return items.filter((product) => product.discountPercent > 0).slice(0, 8);
  }, [data]);

  if (!isLoading && deals.length === 0) return null;

  return (
    <section
      className="dark-scope relative my-8 overflow-hidden rounded-[2rem] bg-obsidian py-10 lg:py-14"
      aria-labelledby={DEAL_ANCHOR_ID}
    >
      {/* Ambient blooms — pure decoration, kept off the tab order. */}
      <div aria-hidden="true" className="ambient-glow -top-16 -left-20 size-72 bg-indigo-500/40" />
      <div aria-hidden="true" className="ambient-glow right-0 -bottom-24 size-80 bg-orange-500/30" />

      <div className="relative px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-chip bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase ring-1 ring-white/15 ring-inset">
              <IconFlame size={13} filled className="text-orange-400" />
              Deal of the day
            </p>
            <h2
              id={DEAL_ANCHOR_ID}
              className="max-w-xl font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-white sm:text-4xl"
            >
              Prices this good{' '}
              <span className="bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">
                won&apos;t last.
              </span>
            </h2>
          </div>

          <DealHeaderCountdown />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
          {isLoading
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full bg-white/10" />
                  <Skeleton className="h-4 w-4/5 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                </div>
              ))
            : deals.map((product, index) => (
                <ProductCardView
                  key={product.id}
                  product={product}
                  index={index}
                  priority={index < 2}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={toggle}
                  onQuickView={openQuickView}
                />
              ))}
        </div>

        <div className="mt-9 flex justify-center">
          <Link
            to="/?featured=true"
            className="group inline-flex h-12 items-center gap-2 rounded-chip bg-white px-6 text-sm font-bold text-slate-900 shadow-e3 transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            See all deals
            <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
