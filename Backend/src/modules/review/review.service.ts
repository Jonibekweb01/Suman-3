import type { Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../core/errors';
import { pageMeta, resolvePage } from '../../core/pagination';
import { prisma } from '../../core/prisma';

/**
 * Recomputes the denormalized `rating` / `reviewCount` on the product.
 *
 * They are stored on `Product` because the grid sorts and filters by rating —
 * an aggregate per card would be far too expensive. The cost is this
 * recalculation on every review write, inside the same transaction so the two
 * can never disagree.
 */
async function recalculateRating(tx: Prisma.TransactionClient, productId: string): Promise<void> {
  const aggregate = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      reviewCount: aggregate._count,
    },
  });
}

export async function listReviews(productId: string, page = 1, limit = 10) {
  const params = resolvePage(page, limit);

  // The star-rating histogram is read outside the transaction: `groupBy`
  // inside a `$transaction` array loses its narrow return type, and an
  // approximate histogram is harmless while the page count must be exact.
  const distribution = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId },
    _count: { rating: true },
    orderBy: { rating: 'asc' },
  });

  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.review.count({ where: { productId } }),
  ]);

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const bucket of distribution) breakdown[bucket.rating] = bucket._count.rating;

  return {
    items: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt,
      author: {
        id: row.user.id,
        // Only the initial of the surname is exposed — full names of
        // customers do not belong on a public product page.
        name: [row.user.firstName, row.user.lastName?.charAt(0)].filter(Boolean).join(' '),
        avatarUrl: row.user.avatarUrl,
      },
    })),
    meta: { ...pageMeta(total, params), breakdown },
  };
}

export async function upsertReview(
  userId: string,
  productId: string,
  input: { rating: number; comment?: string | undefined },
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) throw new NotFoundError('Product');

  // Verified-purchase gate: reviews are only worth anything if the reviewer
  // actually received the item.
  const hasDelivered = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: 'DELIVERED' } },
    select: { id: true },
  });

  if (!hasDelivered) {
    throw new ForbiddenError('You can review a product only after your order has been delivered');
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: { productId_userId: { productId, userId } },
      create: { productId, userId, rating: input.rating, comment: input.comment ?? null },
      update: { rating: input.rating, comment: input.comment ?? null },
      select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true },
    });

    await recalculateRating(tx, productId);
    return review;
  });
}

export async function deleteReview(userId: string, reviewId: string, isAdmin: boolean): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, productId: true },
  });
  if (!review) throw new NotFoundError('Review');
  if (review.userId !== userId && !isAdmin) throw new ForbiddenError('This review is not yours');

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recalculateRating(tx, review.productId);
  });
}
