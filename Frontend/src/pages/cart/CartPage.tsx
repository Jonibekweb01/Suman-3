import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartQuantity,
} from '../../entities/cart/queries';
import { useAuthStore } from '../../entities/user/store';
import { useAuthModal } from '../../features/auth/model/useAuthModal';
import { cn } from '../../shared/lib/cn';
import { formatPrice } from '../../shared/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  IconAlert,
  IconBag,
  IconMinus,
  IconPlus,
  IconTrash,
  Image,
  Skeleton,
} from '../../shared/ui';
import type { CartLine } from '../../shared/types/commerce';
import { CheckoutModal } from './CheckoutModal';

function CartRow({ line }: { line: CartLine }) {
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveCartItem();

  const disabled = updateQuantity.isPending || removeItem.isPending;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex gap-4 border-b border-line py-5',
        !line.isAvailable && 'opacity-55',
      )}
    >
      <Link to={`/product/${line.productId}`} className="w-24 shrink-0 sm:w-28">
        <Image src={line.image} alt={line.title} ratio="portrait" sizes="112px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/product/${line.productId}`} className="line-clamp-2 text-sm hover:underline">
              {line.title}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {line.color} · {line.size}
            </p>
          </div>

          <button
            type="button"
            onClick={() => removeItem.mutate(line.variantId)}
            disabled={disabled}
            aria-label={`Remove ${line.title}`}
            className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={17} />
          </button>
        </div>

        {!line.isAvailable && (
          <Badge tone="outline" className="mt-2 w-fit border-danger text-danger">
            No longer available
          </Badge>
        )}

        {line.isAvailable && line.exceedsStock && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <IconAlert size={14} />
            Only {line.stock} left — reduce the quantity to check out
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex h-10 items-center rounded-card border border-line-strong">
            <button
              type="button"
              onClick={() =>
                updateQuantity.mutate({ variantId: line.variantId, quantity: line.quantity - 1 })
              }
              disabled={disabled || line.quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-10 place-items-center disabled:text-muted"
            >
              <IconMinus size={14} />
            </button>
            <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
            <button
              type="button"
              onClick={() =>
                updateQuantity.mutate({ variantId: line.variantId, quantity: line.quantity + 1 })
              }
              disabled={disabled || line.quantity >= line.stock}
              aria-label="Increase quantity"
              className="grid size-10 place-items-center disabled:text-muted"
            >
              <IconPlus size={14} />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatPrice(line.lineTotal)}</p>
            {line.quantity > 1 && (
              <p className="text-xs text-muted tabular-nums">{formatPrice(line.unitPrice)} each</p>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export default function CartPage() {
  const { cart, isLoading, isGuest } = useCart();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthModal((state) => state.open);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { summary, items } = cart;
  const canCheckout = items.length > 0 && !summary.hasIssues;

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="mb-8 h-10 w-48" />
        <div className="space-y-5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<IconBag size={44} />}
          title="Your bag is empty"
          description="Once you add something you like, it will show up here."
          action={
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-card bg-ink px-8 text-sm font-medium text-canvas transition-colors hover:bg-ink-soft"
            >
              Start shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="mb-8 text-3xl tracking-tight sm:text-4xl">
        Your bag
        <span className="ml-3 align-middle text-base font-normal text-muted">
          {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
        </span>
      </h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="min-w-0">
          <AnimatePresence initial={false}>
            {items.map((line) => (
              <CartRow key={line.variantId} line={line} />
            ))}
          </AnimatePresence>
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-lg font-medium">Order summary</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(summary.subtotal, summary.currency)}</dd>
              </div>

              {summary.discount > 0 && (
                <div className="flex justify-between text-accent">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatPrice(summary.discount, summary.currency)}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {isGuest
                    ? 'Calculated at checkout'
                    : summary.deliveryFee === 0
                      ? 'Free'
                      : formatPrice(summary.deliveryFee, summary.currency)}
                </dd>
              </div>

              <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(summary.total, summary.currency)}</dd>
              </div>
            </dl>

            {!isGuest && summary.amountToFreeDelivery > 0 && (
              <div className="mt-4 rounded-card bg-accent-soft px-3 py-3 text-xs text-accent">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Add {formatPrice(summary.amountToFreeDelivery, summary.currency)} more for free delivery
                  </span>
                  <span className="font-medium">Almost there</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/15">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.subtotal / (summary.subtotal + summary.amountToFreeDelivery)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {summary.hasIssues && (
              <p className="mt-4 flex items-start gap-2 rounded-card bg-danger-soft px-3 py-2.5 text-xs text-danger">
                <IconAlert size={14} className="mt-px shrink-0" />
                Resolve the flagged items above before checking out.
              </p>
            )}

            <Button
              size="lg"
              fullWidth
              className="mt-5"
              disabled={!canCheckout}
              onClick={() => {
                // Checkout needs a real account: the order, the address book
                // and the receipt all hang off a user id.
                if (!isAuthenticated) {
                  openAuthModal('login', '/cart');
                  return;
                }
                setCheckoutOpen(true);
              }}
            >
              {isAuthenticated ? 'Proceed to checkout' : 'Sign in to check out'}
            </Button>

            <Link
              to="/"
              className="mt-3 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart} />
    </div>
  );
}
