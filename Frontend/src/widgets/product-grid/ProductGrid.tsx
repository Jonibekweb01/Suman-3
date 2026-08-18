import { ProductCardView } from '../../entities/product/ui/ProductCardView';
import { useQuickView } from '../../features/quick-view/useQuickView';
import { useToggleWishlist, useWishlistIds } from '../../features/wishlist/useWishlist';
import { useIntersectionObserver } from '../../shared/lib/hooks';
import { Button, EmptyState, IconBag, Skeleton, Spinner } from '../../shared/ui';
import type { ProductCard } from '../../shared/types/product';

export interface ProductGridProps {
  products: ProductCard[];
  isLoading: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onClearFilters?: () => void;
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </>
  );
}

/**
 * Responsive product grid with infinite scroll.
 *
 * A sentinel below the last row triggers the next page 400px early, so the
 * shopper never sees the loader unless the network is slow. The manual
 * "Load more" button stays as a fallback for anyone who cannot trigger an
 * intersection — keyboard-only users, or a browser that throttles observers
 * in a background tab.
 */
export function ProductGrid({
  products,
  isLoading,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  onClearFilters,
}: ProductGridProps) {
  const wishlistIds = useWishlistIds();
  const { toggle } = useToggleWishlist();
  const openQuickView = useQuickView((state) => state.open);

  const sentinelRef = useIntersectionObserver(() => onLoadMore?.(), {
    enabled: hasNextPage && !isFetchingNextPage && Boolean(onLoadMore),
  });

  if (!isLoading && products.length === 0) {
    return (
      <EmptyState
        icon={<IconBag size={40} />}
        title="Nothing matches those filters"
        description="Try widening the price range or clearing a filter or two."
        action={
          onClearFilters && (
            <Button variant="secondary" onClick={onClearFilters}>
              Clear filters
            </Button>
          )
        }
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-3 lg:gap-x-5 xl:grid-cols-4">
        {isLoading && products.length === 0 ? (
          <GridSkeleton />
        ) : (
          products.map((product, index) => (
            <ProductCardView
              key={product.id}
              product={product}
              index={index}
              // Only the first four cards can be the LCP element; eager-loading
              // more would compete with them for bandwidth.
              priority={index < 4}
              isWishlisted={wishlistIds.has(product.id)}
              onToggleWishlist={toggle}
              onQuickView={openQuickView}
            />
          ))
        )}

        {isFetchingNextPage && <GridSkeleton count={4} />}
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {hasNextPage && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={onLoadMore}
            isLoading={isFetchingNextPage}
            className="min-w-56"
          >
            Load more
          </Button>
        </div>
      )}

      {!hasNextPage && products.length > 12 && (
        <p className="mt-12 text-center text-sm text-muted">You have reached the end.</p>
      )}

      {/* Announce loading to screen readers, which cannot see the skeletons. */}
      <span className="sr-only" role="status" aria-live="polite">
        {isFetchingNextPage ? 'Loading more products' : ''}
      </span>
      {isFetchingNextPage && <Spinner className="sr-only" />}
    </div>
  );
}
