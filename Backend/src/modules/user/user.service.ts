import type { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../core/errors';
import { pageMeta, resolvePage } from '../../core/pagination';
import { prisma } from '../../core/prisma';
import { publicUserSelect } from '../auth/auth.service';
import type { CreateAddressInput, UpdateAddressInput } from '../order/order.schema';

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfile(
  userId: string,
  input: { firstName?: string; lastName?: string | null; avatarUrl?: string | null },
) {
  const data: Prisma.UserUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

  return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
}

/**
 * Deletes the account.
 *
 * Orders reference the user with `onDelete: Restrict` on purpose — financial
 * records must survive. So an account with order history is anonymized
 * instead of removed, which satisfies a deletion request without destroying
 * the books.
 */
export async function deleteAccount(userId: string): Promise<{ deleted: boolean }> {
  const orderCount = await prisma.order.count({ where: { userId } });

  if (orderCount === 0) {
    await prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: null,
        phone: null,
        firstName: 'Deleted',
        lastName: 'user',
        avatarUrl: null,
        isBlocked: true,
        tokenVersion: { increment: 1 },
        passwordHash: '',
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.wishlistItem.deleteMany({ where: { userId } }),
    prisma.address.deleteMany({ where: { userId } }),
  ]);

  return { deleted: false };
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= 10) throw new ConflictError('You can save up to 10 addresses');

  // The first address is always the default, otherwise checkout would have
  // nothing preselected.
  const isDefault = input.isDefault || count === 0;

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        userId,
        fullName: input.fullName,
        phone: input.phone,
        region: input.region,
        city: input.city,
        street: input.street,
        apartment: input.apartment ?? null,
        postalCode: input.postalCode ?? null,
        isDefault,
      },
    });
  });
}

export async function updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw new NotFoundError('Address');

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.region !== undefined ? { region: input.region } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.street !== undefined ? { street: input.street } : {}),
        ...(input.apartment !== undefined ? { apartment: input.apartment ?? null } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw new NotFoundError('Address');

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });

    // Promote another address so the user is never left without a default.
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listUsers(query: { q?: string; role?: 'USER' | 'ADMIN'; page: number; limit: number }) {
  const params = resolvePage(query.page, query.limit);

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q, mode: 'insensitive' } },
            { lastName: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        ...publicUserSelect,
        isBlocked: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: pageMeta(total, params) };
}

export async function setBlocked(userId: string, isBlocked: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw new NotFoundError('User');
  if (user.role === 'ADMIN') throw new ConflictError('Administrators cannot be blocked');

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      // Bumping the version kills live access tokens immediately; without it
      // a blocked user would keep browsing for up to 15 minutes.
      data: { isBlocked, tokenVersion: { increment: 1 } },
      select: { ...publicUserSelect, isBlocked: true },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return updated;
}
