import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, CartLine, GuestCartLine } from '../../shared/types/commerce';

/**
 * A guest cart line carries a denormalized snapshot of the product.
 *
 * The server cart joins through to the catalog, but a signed-out shopper has
 * no server cart — so the fields needed to render the line are stored
 * alongside the id. Only `{ variantId, quantity }` is sent on merge; the
 * snapshot is display-only and the server re-prices everything at checkout.
 */
export interface GuestCartItem {
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  image: string | null;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  unitPrice: number;
  oldUnitPrice: number | null;
  currency: string;
  stock: number;
  quantity: number;
}

interface GuestCartState {
  items: GuestCartItem[];
  add: (item: Omit<GuestCartItem, 'quantity'>, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  toMergePayload: () => GuestCartLine[];
}

const STORAGE_KEY = 'suman.guest-cart';

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item, quantity) =>
        set((state) => {
          const existing = state.items.find((line) => line.variantId === item.variantId);
          if (existing) {
            // Top up the existing line, clamped to what the catalog says is left.
            const next = Math.min(existing.quantity + quantity, item.stock, 99);
            return {
              items: state.items.map((line) =>
                line.variantId === item.variantId ? { ...line, ...item, quantity: next } : line,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.min(quantity, item.stock, 99) }] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((line) =>
              line.variantId === variantId
                ? { ...line, quantity: Math.min(Math.max(quantity, 0), line.stock, 99) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),

      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((line) => line.variantId !== variantId) })),

      clear: () => set({ items: [] }),

      toMergePayload: () =>
        get().items.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    }),
    {
      name: STORAGE_KEY,
      // Only the cart contents are persisted — never a token or user identity.
      partialize: (state) => ({ items: state.items }),
      version: 1,
    },
  ),
);

/**
 * Projects the guest cart into the same `Cart` shape the API returns, so the
 * cart page and header badge render identically whether or not the shopper is
 * signed in.
 *
 * Delivery is shown as "calculated at checkout" rather than guessed: the
 * thresholds live in server config, and quoting a wrong number here would be
 * worse than quoting none.
 */
export function projectGuestCart(items: GuestCartItem[]): Cart {
  const lines: CartLine[] = items.map((item) => ({
    id: item.variantId,
    variantId: item.variantId,
    productId: item.productId,
    title: item.title,
    slug: item.slug,
    image: item.image,
    blurHash: null,
    color: item.color,
    colorHex: item.colorHex,
    size: item.size,
    sku: item.sku,
    unitPrice: item.unitPrice,
    oldUnitPrice: item.oldUnitPrice,
    quantity: item.quantity,
    lineTotal: item.unitPrice * item.quantity,
    stock: item.stock,
    isAvailable: item.stock > 0,
    exceedsStock: item.quantity > item.stock,
  }));

  const subtotal = lines
    .filter((line) => line.isAvailable && !line.exceedsStock)
    .reduce((sum, line) => sum + line.lineTotal, 0);

  return {
    items: lines,
    summary: {
      subtotal,
      discount: 0,
      deliveryFee: 0,
      total: subtotal,
      freeDeliveryThreshold: 0,
      amountToFreeDelivery: 0,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      lineCount: lines.length,
      currency: items[0]?.currency ?? 'UZS',
      hasIssues: lines.some((line) => !line.isAvailable || line.exceedsStock),
    },
  };
}
