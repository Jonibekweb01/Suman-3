import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../shared/lib/cn';
import { dealEndTime, scarcityCount } from '../../../shared/lib/deals';
import { formatPrice } from '../../../shared/lib/format';
import {
  Badge,
  CountdownChip,
  HotDealBadge,
  IconEye,
  IconHeart,
  Image,
  PowerPrice,
  QuickAddButton,
  Rating,
  ScarcityMeter,
} from '../../../shared/ui';
import type { ProductCard } from '../../../shared/types/product';

export interface ProductCardViewProps {
  product: ProductCard;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  /** Opens the quick-view sheet instead of navigating. */
  onQuickView?: (productId: string) => void;
  /** Above-the-fold cards skip lazy loading so the LCP image is not deferred. */
  priority?: boolean;
  index?: number;
  /** `compact` drops secondary rows — for dense rails and the right column. */
  variant?: 'default' | 'compact';
}

/**
 * Product card v2.
 *
 * Presentational only: wishlist state and both handlers are injected rather
 * than read from a store, which keeps the entity layer free of feature
 * dependencies (FSD's import rule) and lets the same card serve the grid, the
 * deal rail and the wishlist page.
 *
 * The layout is built around one decision point — the eye should land on the
 * discounted price, then find the add button within a thumb's travel of it.
 * Everything else (brand, rating, swatches) is deliberately quieter.
 */
export const ProductCardView = memo(function ProductCardView({
  product,
  isWishlisted = false,
  onToggleWishlist,
  onQuickView,
  priority = false,
  index = 0,
  variant = 'default',
}: ProductCardViewProps) {
  const [hovered, setHovered] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [burst, setBurst] = useState(false);

  const primaryImage = product.images[0]?.url ?? null;
  const previewImage = product.images[previewIndex]?.url ?? primaryImage;
  const showHover = hovered && product.images.length > 1;
  const isDeal = product.discountPercent > 0;
  const compact = variant === 'compact';

  // Stable per card — a fresh value each render would make the countdown jump
  // and the stock meter flicker on every parent update.
  const endsAt = useMemo(() => dealEndTime(product.id), [product.id]);
  const leftCount = useMemo(() => scarcityCount(product.id), [product.id]);

  function stop(event: MouseEvent): void {
    // The whole card is a link; without this every control inside navigates.
    event.preventDefault();
    event.stopPropagation();
  }

  function handleQuickAdd(event: MouseEvent): void {
    stop(event);
    onQuickView?.(product.id);
  }

  function handleWishlist(event: MouseEvent): void {
    stop(event);
    if (!isWishlisted) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 450);
    }
    onToggleWishlist?.(product.id);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      // Stagger only the first row; beyond that the delay is perceived as lag.
      transition={{ duration: 0.4, delay: Math.min(index, 7) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      <Link to={`/product/${product.id}`} className="block" aria-label={product.title}>
        <div
          className={cn(
            'relative overflow-hidden rounded-card border border-line bg-surface-sunken shadow-none',
            'transition-all duration-300 ease-out',
            hovered && '-translate-y-0.5 border-line-strong shadow-e2',
          )}
        >
          <div
            className={cn(
              'transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
              hovered && 'scale-[1.05]',
            )}
          >
            <Image
              src={showHover ? previewImage : primaryImage}
              alt={product.images[previewIndex]?.alt ?? product.title}
              ratio="portrait"
              priority={priority}
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            />
          </div>

          {/* Scrim only under the badges, so photography stays untinted. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/15 to-transparent"
          />

          <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
            {isDeal && <HotDealBadge percent={product.discountPercent} />}
            {isDeal && !compact && <CountdownChip targetMs={endsAt} />}
            {!product.inStock && <Badge tone="neutral">Sold out</Badge>}
          </div>

          {onToggleWishlist && (
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              className={cn(
                'absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full',
                'glass-light shadow-e1 transition-all duration-200 ease-out',
                'hover:scale-110 active:scale-90',
                isWishlisted ? 'text-rose' : 'text-ink-soft',
                // Always visible on touch, revealed on hover for pointer devices.
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
                isWishlisted && 'sm:opacity-100',
              )}
            >
              <IconHeart size={17} filled={isWishlisted} />
              {/* Expanding ring on favourite — the visual stand-in for haptics. */}
              <AnimatePresence>
                {burst && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0.7 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-full bg-rose/40"
                  />
                )}
              </AnimatePresence>
            </button>
          )}

          {!compact && (
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Quick view ${product.title}`}
              title="Quick view"
              className={cn(
                'absolute bottom-3 left-3 grid size-9 place-items-center rounded-full',
                'glass-dark text-white shadow-e2 transition-all duration-300 ease-out',
                'hover:scale-110 active:scale-90',
                'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
                'max-sm:translate-y-0 max-sm:opacity-100',
              )}
            >
              <IconEye size={16} />
            </button>
          )}

          {/* The conversion trigger: gradient FAB, thumb-side, always visible. */}
          {product.inStock && (
            <QuickAddButton
              onClick={handleQuickAdd}
              label={`Add ${product.title} to bag`}
              className="absolute right-3 bottom-3"
            />
          )}
        </div>

        <div className={cn('space-y-1.5', compact ? 'pt-2.5' : 'pt-3.5')}>
          {product.brand && (
            <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
              {product.brand}
            </p>
          )}

          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-ink">
            {product.title}
          </h3>

          <PowerPrice
            price={formatPrice(product.price, product.currency)}
            oldPrice={product.oldPrice ? formatPrice(product.oldPrice, product.currency) : null}
            size={compact ? 'sm' : 'md'}
          />

          {!compact && isDeal && product.inStock && <ScarcityMeter count={leftCount} />}

          {!compact && product.reviewCount > 0 && (
            <Rating value={product.rating} count={product.reviewCount} size={12} showValue={false} />
          )}

          {!compact && product.colors.length > 1 && (
            <div className="flex items-center gap-1 pt-0.5">
              {product.colors.slice(0, 5).map((color, colorIndex) => (
                <span
                  key={color.name}
                  onMouseEnter={() => setPreviewIndex(colorIndex % Math.max(product.images.length, 1))}
                  title={color.name}
                  style={{ backgroundColor: color.hex }}
                  className="size-3 rounded-full ring-1 ring-black/10 ring-inset transition-transform hover:scale-125"
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[11px] text-muted">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
});
