import type { Prisma } from '@prisma/client';
import { NotFoundError } from '../../core/errors';
import { pageMeta, resolvePage } from '../../core/pagination';
import { prisma } from '../../core/prisma';

const wishlistProductSelect = {
  id: true,
  title: true,
  slug: true,
  brand: true,
  price: true,
  oldPrice: true,
  currency: true,
  rating: true,
  reviewCount: true,
  isActive: true,
  images: { select: { url: true, blurHash: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
  variants: { select: { stock: true, color: true, colorHex: true } },
} satisfies Prisma.ProductSelect;

export async function listWishlist(userId: string, page = 1, limit = 20) {
  const params = resolvePage(page, limit);

  const [rows, total] = await prisma.$transaction([
    prisma.wishlistItem.findMany({
      where: { userId },
      select: { id: true, createdAt: true, product: { select: wishlistProductSelect } },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.wishlistItem.count({ where: { userId } }),
  ]);

  const items = rows.map((row) => {
    const { variants, ...product } = row.product;
    const colors = [...new Map(variants.map((variant) => [variant.color, {
      name: variant.color,
      hex: variant.colorHex,
    }])).values()];
    return {
      // `id` below is the product's — the wishlist row id is exposed under a
      // distinct name so the client cannot confuse the two.
      wishlistItemId: row.id,
      addedAt: row.createdAt,
      ...product,
      colors,
      inStock: variants.some((variant) => variant.stock > 0),
      discountPercent:
        product.oldPrice && product.oldPrice > product.price
          ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
          : 0,
    };
  });

  return { items, meta: pageMeta(total, params) };
}

/**
 * Idempotent toggle. The heart button fires optimistically on the client, so
 * a double-tap must converge rather than error.
 */
export async function toggleWishlist(
  userId: string,
  productId: string,
): Promise<{ productId: string; wishlisted: boolean }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) throw new NotFoundError('Product');

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { productId, wishlisted: false };
  }

  await prisma.wishlistItem.create({ data: { userId, productId } });
  return { productId, wishlisted: true };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
}

/**
 * Bulk membership check. The grid asks once for the ids on screen instead of
 * firing one request per card.
 */
export async function getWishlistedIds(userId: string, productIds?: string[]): Promise<string[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId, ...(productIds?.length ? { productId: { in: productIds } } : {}) },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

export async function getWishlistCount(userId: string): Promise<number> {
  return prisma.wishlistItem.count({ where: { userId } });
}
