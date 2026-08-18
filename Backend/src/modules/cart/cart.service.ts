import type { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../core/errors';
import { calculateTotals, variantPrice } from '../../core/pricing';
import { prisma } from '../../core/prisma';
import type { MergeCartInput } from './cart.schema';

const cartItemInclude = {
  variant: {
    select: {
      id: true,
      color: true,
      colorHex: true,
      size: true,
      sku: true,
      stock: true,
      priceDiff: true,
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          oldPrice: true,
          currency: true,
          isActive: true,
          images: { select: { url: true, blurHash: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartRow = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  image: string | null;
  blurHash: string | null;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  unitPrice: number;
  oldUnitPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  /** The catalog no longer carries this item; the line is shown struck out. */
  isAvailable: boolean;
  /** Requested quantity exceeds stock — checkout is blocked until resolved. */
  exceedsStock: boolean;
}

function shapeLine(row: CartRow): CartLine {
  const { variant } = row;
  const { product } = variant;
  const unitPrice = variantPrice(product.price, variant.priceDiff);
  const isAvailable = product.isActive && variant.stock > 0;

  return {
    id: row.id,
    variantId: variant.id,
    productId: product.id,
    title: product.title,
    slug: product.slug,
    image: product.images[0]?.url ?? null,
    blurHash: product.images[0]?.blurHash ?? null,
    color: variant.color,
    colorHex: variant.colorHex,
    size: variant.size,
    sku: variant.sku,
    unitPrice,
    oldUnitPrice: product.oldPrice ? variantPrice(product.oldPrice, variant.priceDiff) : null,
    quantity: row.quantity,
    lineTotal: unitPrice * row.quantity,
    stock: variant.stock,
    isAvailable,
    exceedsStock: row.quantity > variant.stock,
  };
}

export async function getCart(userId: string) {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    include: cartItemInclude,
    orderBy: { createdAt: 'desc' },
  });

  const lines = rows.map(shapeLine);
  // Unavailable and over-stock lines are excluded from the total so the
  // displayed amount always matches what checkout would actually charge.
  const payable = lines.filter((line) => line.isAvailable && !line.exceedsStock);

  const totals = calculateTotals(payable.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })));

  return {
    items: lines,
    summary: {
      ...totals,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      lineCount: lines.length,
      currency: rows[0]?.variant.product.currency ?? 'UZS',
      hasIssues: lines.some((line) => !line.isAvailable || line.exceedsStock),
    },
  };
}

export async function addToCart(userId: string, variantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, stock: true, product: { select: { isActive: true, title: true } } },
  });

  if (!variant) throw new NotFoundError('Variant');
  if (!variant.product.isActive) throw new ConflictError('This product is no longer available');

  const existing = await prisma.cartItem.findUnique({
    where: { userId_variantId: { userId, variantId } },
    select: { quantity: true },
  });

  // Adding the same variant twice tops up the existing line rather than
  // creating a duplicate row.
  const desired = (existing?.quantity ?? 0) + quantity;

  if (desired > variant.stock) {
    throw new ConflictError(
      variant.stock === 0
        ? 'This item is out of stock'
        : `Only ${variant.stock} left in stock`,
    );
  }

  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId, variantId } },
    create: { userId, variantId, quantity },
    update: { quantity: desired },
  });

  return getCart(userId);
}

export async function updateQuantity(userId: string, variantId: string, quantity: number) {
  const item = await prisma.cartItem.findUnique({
    where: { userId_variantId: { userId, variantId } },
    select: { id: true, variant: { select: { stock: true } } },
  });

  if (!item) throw new NotFoundError('Cart item');
  if (quantity > item.variant.stock) {
    throw new ConflictError(`Only ${item.variant.stock} left in stock`);
  }

  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return getCart(userId);
}

export async function removeItem(userId: string, variantId: string) {
  await prisma.cartItem.deleteMany({ where: { userId, variantId } });
  return getCart(userId);
}

export async function clearCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

/**
 * Folds a guest cart into the persisted one.
 *
 * Quantities are summed and then clamped to available stock instead of
 * rejected — a sign-in should never fail because the local cart drifted out
 * of date.
 */
export async function mergeCart(userId: string, input: MergeCartInput) {
  if (input.items.length === 0) return getCart(userId);

  const variantIds = [...new Set(input.items.map((item) => item.variantId))];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, product: { isActive: true } },
    select: { id: true, stock: true },
  });
  const stockById = new Map(variants.map((v) => [v.id, v.stock]));

  const existing = await prisma.cartItem.findMany({
    where: { userId, variantId: { in: variantIds } },
    select: { variantId: true, quantity: true },
  });
  const existingByVariant = new Map(existing.map((item) => [item.variantId, item.quantity]));

  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const item of input.items) {
    const stock = stockById.get(item.variantId);
    if (stock === undefined || stock === 0) continue; // silently drop dead lines

    const merged = Math.min((existingByVariant.get(item.variantId) ?? 0) + item.quantity, stock, 99);

    operations.push(
      prisma.cartItem.upsert({
        where: { userId_variantId: { userId, variantId: item.variantId } },
        create: { userId, variantId: item.variantId, quantity: merged },
        update: { quantity: merged },
      }),
    );
  }

  if (operations.length > 0) await prisma.$transaction(operations);
  return getCart(userId);
}

/** Header badge — one cheap aggregate instead of loading the whole cart. */
export async function getCartCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({ where: { userId }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
