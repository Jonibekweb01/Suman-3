import { env } from '../config/env';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

/**
 * Single source of truth for money math.
 *
 * Cart preview and checkout MUST agree to the last tiyin — if they diverge,
 * the customer sees one total and is charged another. Both call in here.
 */
export function calculateTotals(lines: PricedLine[], options: { discount?: number } = {}) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discount = Math.min(Math.max(options.discount ?? 0, 0), subtotal);
  const afterDiscount = subtotal - discount;

  const qualifiesForFreeDelivery =
    env.FREE_DELIVERY_THRESHOLD > 0 && afterDiscount >= env.FREE_DELIVERY_THRESHOLD;

  const deliveryFee = afterDiscount === 0 || qualifiesForFreeDelivery ? 0 : env.DELIVERY_FEE;

  return {
    subtotal,
    discount,
    deliveryFee,
    total: afterDiscount + deliveryFee,
    freeDeliveryThreshold: env.FREE_DELIVERY_THRESHOLD,
    /** How much more the shopper must add to unlock free delivery. */
    amountToFreeDelivery: qualifiesForFreeDelivery
      ? 0
      : Math.max(env.FREE_DELIVERY_THRESHOLD - afterDiscount, 0),
  };
}

/** A variant's effective price: base price plus its signed delta. */
export function variantPrice(basePrice: number, priceDiff: number): number {
  return Math.max(basePrice + priceDiff, 0);
}
