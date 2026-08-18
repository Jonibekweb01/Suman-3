import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProduct } from '../../entities/product/queries';
import { useAddToCart } from '../../features/cart/useAddToCart';
import { useQuickView } from '../../features/quick-view/useQuickView';
import { cn } from '../../shared/lib/cn';
import { dealEndTime, scarcityCount } from '../../shared/lib/deals';
import { formatPrice } from '../../shared/lib/format';
import {
  BottomSheet,
  Button,
  CountdownChip,
  IconArrowRight,
  IconCheck,
  IconTruckFast,
  Image,
  PowerPrice,
  Rating,
  ScarcityMeter,
  Skeleton,
  TrustChip,
} from '../../shared/ui';

/**
 * Quick view — options selection without leaving the feed.
 *
 * The whole conversion argument for this sheet is that choosing a size should
 * not cost a page load and a lost scroll position. It carries just enough of
 * the product page to complete a purchase decision (gallery thumb, price,
 * colour, size, stock, delivery reassurance) and links out for the rest.
 */
export function QuickViewSheet() {
  const { productId, isOpen, close } = useQuickView();
  const { data: product, isLoading } = useProduct(isOpen && productId ? productId : undefined);
  const addToCart = useAddToCart();

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  // A fresh product means the previous selection is meaningless.
  useEffect(() => {
    setColor(null);
    setSize(null);
  }, [productId]);

  const colors = useMemo(() => {
    if (!product) return [];
    const seen = new Map<string, string>();
    for (const variant of product.variants) {
      if (!seen.has(variant.color)) seen.set(variant.color, variant.colorHex);
    }
    return [...seen].map(([name, hex]) => ({ name, hex }));
  }, [product]);

  const activeColor = color ?? colors[0]?.name ?? null;

  // Sizes are scoped to the chosen colour: offering a size that only exists in
  // another colourway produces an "out of stock" dead end at the last step.
  const sizesForColor = useMemo(() => {
    if (!product) return [];
    return product.variants
      .filter((variant) => variant.color === activeColor)
      .map((variant) => ({ size: variant.size, stock: variant.stock, id: variant.id }));
  }, [product, activeColor]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.color === activeColor && variant.size === size) ??
      null,
    [product, activeColor, size],
  );

  const needsSize = sizesForColor.length > 0 && !selectedVariant;
  const unitPrice = product ? product.price + (selectedVariant?.priceDiff ?? 0) : 0;

  function handleAdd(): void {
    if (!product || !selectedVariant) return;
    addToCart.mutate({ product, variant: selectedVariant, quantity: 1 }, { onSuccess: () => close() });
  }

  return (
    <BottomSheet
      open={isOpen}
      onClose={close}
      title={product?.title ?? 'Quick view'}
      maxHeight="tall"
      footer={
        product && (
          <div className="flex items-center gap-3">
            <Link
              to={`/product/${product.id}`}
              onClick={close}
              className="grid size-12 shrink-0 place-items-center rounded-field bg-surface-sunken text-ink-soft transition-all duration-200 hover:bg-line active:scale-90"
              aria-label="Open full product page"
              title="Full details"
            >
              <IconArrowRight size={18} />
            </Link>
            <Button
              size="lg"
              fullWidth
              onClick={handleAdd}
              disabled={needsSize || !product.inStock}
              isLoading={addToCart.isPending}
              className="shimmer-sweep"
            >
              {!product.inStock
                ? 'Sold out'
                : needsSize
                  ? 'Select a size'
                  : `Add · ${formatPrice(unitPrice, product.currency)}`}
            </Button>
          </div>
        )
      }
    >
      {isLoading || !product ? (
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-40 w-32 shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-5 pt-1">
          <div className="flex gap-4">
            <Link
              to={`/product/${product.id}`}
              onClick={close}
              className="w-32 shrink-0 overflow-hidden rounded-2xl shadow-e2"
            >
              <Image
                src={product.images[0]?.url ?? null}
                alt={product.title}
                ratio="portrait"
                priority
                sizes="128px"
              />
            </Link>

            <div className="min-w-0 flex-1 space-y-2">
              {product.brand && (
                <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
                  {product.brand}
                </p>
              )}

              <PowerPrice
                price={formatPrice(unitPrice, product.currency)}
                oldPrice={product.oldPrice ? formatPrice(product.oldPrice, product.currency) : null}
                size="md"
              />

              {product.reviewCount > 0 && (
                <Rating value={product.rating} count={product.reviewCount} size={13} />
              )}

              {product.discountPercent > 0 && (
                <CountdownChip targetMs={dealEndTime(product.id)} tone="amber" />
              )}
            </div>
          </div>

          {product.inStock && <ScarcityMeter count={scarcityCount(product.id)} />}

          {colors.length > 1 && (
            <section>
              <p className="mb-2.5 text-xs font-bold tracking-wide text-muted uppercase">
                Colour — <span className="text-ink">{activeColor}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((swatch) => {
                  const active = swatch.name === activeColor;
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => {
                        setColor(swatch.name);
                        setSize(null);
                      }}
                      aria-label={swatch.name}
                      aria-pressed={active}
                      title={swatch.name}
                      className={cn(
                        'grid size-10 place-items-center rounded-full transition-all duration-200 active:scale-90',
                        active && 'ring-2 ring-brand ring-offset-2 ring-offset-surface',
                      )}
                    >
                      <span
                        style={{ backgroundColor: swatch.hex }}
                        className="grid size-8 place-items-center rounded-full ring-1 ring-black/10 ring-inset"
                      >
                        {active && <IconCheck size={14} className="text-white mix-blend-difference" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {sizesForColor.length > 0 && (
            <section>
              <p className="mb-2.5 text-xs font-bold tracking-wide text-muted uppercase">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((option) => {
                  const active = option.size === size;
                  const soldOut = option.stock <= 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSize(option.size)}
                      aria-pressed={active}
                      className={cn(
                        'h-11 min-w-12 rounded-field px-3.5 text-sm font-bold transition-all duration-200 active:scale-90',
                        soldOut && 'cursor-not-allowed text-muted/50 line-through',
                        !soldOut &&
                          (active
                            ? 'bg-brand text-white shadow-e1'
                            : 'bg-surface-sunken text-ink hover:bg-line'),
                      )}
                    >
                      {option.size}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <TrustChip>In stock — ships today</TrustChip>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand-strong">
              <IconTruckFast size={13} />
              Free returns within 14 days
            </span>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
