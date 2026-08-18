import { Link } from 'react-router-dom';
import { ProductCardView } from '../../entities/product/ui/ProductCardView';
import { useToggleWishlist, useWishlistItems } from '../../features/wishlist/useWishlist';
import { EmptyState, IconHeart, Skeleton } from '../../shared/ui';

export default function WishlistPage() {
  const { data, isLoading } = useWishlistItems();
  const { toggle } = useToggleWishlist();

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="mb-8 h-10 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<IconHeart size={44} />}
          title="Your wishlist is empty"
          description="Tap the heart on anything you like and it will be waiting here."
          action={
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-card bg-ink px-8 text-sm font-medium text-canvas transition-colors hover:bg-ink-soft"
            >
              Browse the shop
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="mb-8 text-3xl tracking-tight sm:text-4xl">
        Wishlist
        <span className="ml-3 align-middle text-base font-normal text-muted">
          {data?.meta.total ?? items.length} saved
        </span>
      </h1>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-3 lg:gap-x-5 xl:grid-cols-4">
        {items.map((item, index) => (
          <ProductCardView
            key={item.id}
            product={item}
            index={index}
            priority={index < 4}
            // Everything on this page is wishlisted by definition; the heart
            // acts purely as a remove control.
            isWishlisted
            onToggleWishlist={toggle}
          />
        ))}
      </div>
    </div>
  );
}
