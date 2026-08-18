import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProduct } from "../../entities/product/queries";
import { useAddToCart } from "../../features/cart/useAddToCart";
import {
  useToggleWishlist,
  useWishlistIds,
} from "../../features/wishlist/useWishlist";
import { cn } from "../../shared/lib/cn";
import {
  Button,
  EmptyState,
  IconChevronRight,
  IconHeart,
  IconMinus,
  IconPlus,
  Rating,
  Skeleton,
} from "../../shared/ui";
import type { ProductVariant } from "../../shared/types/product";
import { ProductGallery } from "../../widgets/product-gallery/ProductGallery";

const LOW_STOCK_THRESHOLD = 5;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useProduct(id);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const addToCart = useAddToCart();
  const wishlistIds = useWishlistIds();
  const { toggle: toggleWishlist } = useToggleWishlist();

  // Navigating between products remounts nothing (same route), so selection
  // has to be reset explicitly or a size from the previous item lingers.
  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  // Default to the first colour that actually has stock.
  useEffect(() => {
    if (!product || selectedColor) return;
    const firstInStock = product.variants.find((variant) => variant.stock > 0);
    setSelectedColor(firstInStock?.color ?? product.colors[0]?.name ?? null);
  }, [product, selectedColor]);

  const sizesForColor = useMemo(() => {
    if (!product || !selectedColor) return [];
    return product.variants
      .filter((variant) => variant.color === selectedColor)
      .sort(
        (a, b) => product.sizes.indexOf(a.size) - product.sizes.indexOf(b.size),
      );
  }, [product, selectedColor]);

  const selectedVariant: ProductVariant | undefined = useMemo(
    () =>
      product?.variants.find(
        (variant) =>
          variant.color === selectedColor && variant.size === selectedSize,
      ),
    [product, selectedColor, selectedSize],
  );

  const activePrice = product
    ? Math.max(product.price + (selectedVariant?.priceDiff ?? 0), 0)
    : 0;

  const activeOldPrice =
    product?.oldPrice != null
      ? product.oldPrice + (selectedVariant?.priceDiff ?? 0)
      : null;

  const maxQuantity = Math.min(selectedVariant?.stock ?? 1, 10);

  function handleAdd(then?: "cart" | "checkout"): void {
    if (!product) return;

    if (!selectedVariant) {
      setSizeError(true);
      document
        .getElementById("size-selector")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setSizeError(false);
    addToCart.mutate(
      { product, variant: selectedVariant, quantity },
      { onSuccess: () => then && navigate("/cart") },
    );
  }

  if (isLoading) return <ProductSkeleton />;

  if (isError || !product) {
    return (
      <div className="container-page">
        <EmptyState
          title="Product not found"
          description="It may have sold out or been removed from the catalogue."
          action={
            <Button onClick={() => navigate("/")} variant="secondary">
              Back to shop
            </Button>
          }
        />
      </div>
    );
  }

  const isWishlisted = wishlistIds.has(product.id);

  return (
    <div className="container-page py-4 sm:py-6 lg:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted lg:mb-6">
        <Link to="/" className="transition-colors hover:text-ink">Home</Link>
        <IconChevronRight size={12} />
        <Link to={product.gender === "MEN" ? "/men" : "/women"} className="capitalize transition-colors hover:text-ink">
          {product.gender.toLowerCase()}
        </Link>
        <IconChevronRight size={12} />
        <Link to={`/?category=${product.category.slug}`} className="transition-colors hover:text-ink">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:items-start lg:gap-8 xl:gap-10">
        <div className="min-w-0 lg:sticky lg:top-24">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        <div className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-[0_12px_35px_rgba(27,22,15,0.05)] sm:p-6 lg:p-7">
          <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.brand && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a716a]">
                  {product.brand}
                </p>
              )}
              <h1 className="mt-1 text-[29px] font-semibold leading-[1.1] tracking-[-0.05em] text-[#171513] sm:text-4xl lg:text-5xl">
                {product.title}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Save to wishlist"
              }
              aria-pressed={isWishlisted}
              className={cn(
                "grid size-11 place-items-center rounded-field border transition-all",
                isWishlisted
                  ? "border-[#e5d4d1] bg-[#fff2ee] text-[#d55346]"
                  : "border-[#d9d4cf] bg-white text-[#1c1a18]",
              )}
            >
              <IconHeart filled={isWishlisted} />
            </button>
          </div>

          {product.reviewCount > 0 && (
            <div className="-mt-1">
              <Rating value={product.rating} count={product.reviewCount} size={15} />
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="text-[31px] font-black tracking-[-0.06em] text-[#171513] sm:text-4xl lg:text-[2.6rem]">
              {new Intl.NumberFormat("en-US").format(activePrice)}
              <span className="text-[14px] font-semibold text-[#5f5954]">
                {" "}{product.currency}
              </span>
            </div>
            {activeOldPrice && (
              <span className="mb-1 text-base text-[#918b86] line-through decoration-[1.5px]">
                {new Intl.NumberFormat("en-US").format(activeOldPrice)} {product.currency}
              </span>
            )}
            {product.discountPercent > 0 && (
              <span className="mb-1 inline-flex rounded-full bg-[#6a67f2] px-2 py-1 text-[10px] font-bold text-white">
                −{product.discountPercent}%
              </span>
            )}
          </div>

          {product.colors.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#332f2d]">Colour</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d7671]">
                  {selectedColor}
                </span>
              </div>

              <div className="flex gap-2.5">
                {product.colors.map((color) => {
                  const hasStock = product.variants.some(
                    (variant) => variant.color === color.name && variant.stock > 0,
                  );
                  const active = selectedColor === color.name;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color.name);
                        setSelectedSize(null);
                        setQuantity(1);
                      }}
                      aria-label={color.name}
                      aria-pressed={active}
                      title={hasStock ? color.name : `${color.name} — sold out`}
                      className={cn(
                        "relative grid size-10 place-items-center rounded-field border transition-all",
                        active ? "border-[#171513] bg-white shadow-sm" : "border-[#d6d0cc] bg-white/70",
                      )}
                    >
                      <span
                        style={{ backgroundColor: color.hex }}
                        className={cn(
                          "size-7 rounded-full ring-1 ring-inset ring-black/10",
                          !hasStock && "opacity-40",
                        )}
                      />
                      {!hasStock && (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center">
                          <span className="h-px w-7 rotate-45 bg-[#4d4a47]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div id="size-selector" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#332f2d]">Size</p>
              <button type="button" className="text-[11px] font-medium text-[#726b65] underline underline-offset-4">
                Size guide
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sizesForColor.map((variant) => {
                const soldOut = variant.stock === 0;
                const active = selectedSize === variant.size;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => {
                      setSelectedSize(variant.size);
                      setSizeError(false);
                      setQuantity(1);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "relative h-11 rounded-field border text-sm font-medium transition-all",
                      active
                        ? "border-[#171513] bg-[#171513] text-white shadow-[0_8px_20px_rgba(26,22,18,0.12)]"
                        : "border-[#d7d0ca] bg-white text-[#1d1a18] hover:border-[#726b65]",
                      soldOut && "cursor-not-allowed border-[#ebdfdc] bg-[#f8f6f4] text-[#a89f9b] hover:border-[#ebdfdc]",
                    )}
                  >
                    {variant.size}
                    {soldOut && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className="h-px w-full rotate-[-20deg] bg-[#a89f9b]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {sizeError && (
              <p role="alert" className="mt-2 text-xs text-danger">
                Please select a size
              </p>
            )}
          </div>

          {selectedVariant && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-sm font-medium",
                selectedVariant.stock === 0
                  ? "text-danger"
                  : selectedVariant.stock <= LOW_STOCK_THRESHOLD
                    ? "text-[#d97a2a]"
                    : "text-[#5e5854]",
              )}
            >
              {selectedVariant.stock === 0
                ? "Sold out in this size"
                : selectedVariant.stock <= LOW_STOCK_THRESHOLD
                  ? `Only ${selectedVariant.stock} left in stock`
                  : "In stock and ready to ship"}
            </motion.p>
          )}

          <div className="flex items-center justify-between gap-3 rounded-field border border-line bg-surface px-2 py-2 shadow-e1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-10 place-items-center text-[#221f1d] disabled:text-[#a29a95]"
            >
              <IconMinus size={16} />
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
              disabled={!selectedVariant || quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="grid size-10 place-items-center text-[#221f1d] disabled:text-[#a29a95]"
            >
              <IconPlus size={16} />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <Button
              size="lg"
              fullWidth
              onClick={() => handleAdd()}
              isLoading={addToCart.isPending}
              disabled={selectedVariant?.stock === 0}
              className="rounded-field bg-brand text-base font-semibold shadow-e1 hover:bg-brand-strong"
            >
              {selectedVariant?.stock === 0 ? "Sold out" : "Add to bag"}
            </Button>

            <Button
              size="lg"
              fullWidth
              variant="secondary"
              onClick={() => handleAdd("checkout")}
              disabled={addToCart.isPending || selectedVariant?.stock === 0}
              className="rounded-field border-line bg-surface text-ink hover:border-line-strong"
            >
              Buy now
            </Button>
          </div>

          <div className="space-y-3 border-t border-[#e8dfd7] pt-4 text-sm text-[#5f5954]">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-[#efecff] text-[#5a52df]">↗</span>
              <div>
                <div className="font-medium text-[#2b2927]">Free delivery</div>
                <div>On orders over 500 000 so'm</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-[#eff7f0] text-[#2d8d4b]">↺</span>
              <div>
                <div className="font-medium text-[#2b2927]">14-day returns</div>
                <div>Unworn, with tags attached</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-[#f4f0ff] text-[#5a52df]">✓</span>
              <div>
                <div className="font-medium text-[#2b2927]">Secure checkout</div>
                <div>Encrypted and end-to-end secure</div>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface-sunken px-3 py-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#706a65]">
              Description
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#635f5b]">
              {product.description}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Skeleton className="aspect-[3/4] w-full" />
        <div className="max-w-lg space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
