import type { OrderStatus, Prisma } from '@prisma/client';
import { ORDER_STATUS_FLOW } from '../../config/constants';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import { calculateTotals, variantPrice } from '../../core/pricing';
import { pageMeta, resolvePage } from '../../core/pagination';
import { prisma } from '../../core/prisma';
import { generateOrderNumber } from '../../utils/slug';
import { notifyOrderPlaced } from '../notification/notification.service';
import type {
  AdminListOrdersQuery,
  CreateOrderInput,
  ListOrdersQuery,
} from './order.schema';

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotal: true,
  discount: true,
  deliveryFee: true,
  total: true,
  currency: true,
  shipFullName: true,
  shipPhone: true,
  shipRegion: true,
  shipCity: true,
  shipStreet: true,
  shipApartment: true,
  shipPostalCode: true,
  note: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      variantId: true,
      titleSnapshot: true,
      imageSnapshot: true,
      color: true,
      size: true,
      sku: true,
      unitPrice: true,
      quantity: true,
      total: true,
    },
  },
} satisfies Prisma.OrderSelect;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Places an order.
 *
 * Everything below runs inside a single serializable-ish transaction: stock is
 * decremented with a conditional `updateMany` that only matches rows which
 * still have enough left. If the match count is zero, another checkout won the
 * race and the whole transaction rolls back — no overselling, no partial order.
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
  const shipping = await resolveShippingAddress(userId, input);

  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId,
      ...(input.variantIds?.length ? { variantId: { in: input.variantIds } } : {}),
    },
    include: {
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
              price: true,
              currency: true,
              isActive: true,
              images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (cartItems.length === 0) throw new BadRequestError('Your cart is empty');

  const unavailable = cartItems.filter((item) => !item.variant.product.isActive);
  if (unavailable.length > 0) {
    throw new ConflictError('Some items are no longer available', {
      items: unavailable.map((item) => item.variant.product.title),
    });
  }

  const short = cartItems.filter((item) => item.quantity > item.variant.stock);
  if (short.length > 0) {
    throw new ConflictError('Some items do not have enough stock', {
      items: short.map((item) => ({
        title: item.variant.product.title,
        requested: item.quantity,
        available: item.variant.stock,
      })),
    });
  }

  const lines = cartItems.map((item) => {
    const unitPrice = variantPrice(item.variant.product.price, item.variant.priceDiff);
    return {
      variantId: item.variant.id,
      productId: item.variant.product.id,
      titleSnapshot: item.variant.product.title,
      imageSnapshot: item.variant.product.images[0]?.url ?? null,
      color: item.variant.color,
      size: item.variant.size,
      sku: item.variant.sku,
      unitPrice,
      quantity: item.quantity,
      total: unitPrice * item.quantity,
    };
  });

  const totals = calculateTotals(lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })));
  const currency = cartItems[0]?.variant.product.currency ?? 'UZS';

  const order = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const claimed = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });

      // Zero rows updated means the stock guard in the WHERE failed — someone
      // else bought the last one between our read and this write.
      if (claimed.count === 0) {
        throw new ConflictError(`"${line.titleSnapshot}" just sold out. Please review your cart.`);
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        paymentMethod: input.paymentMethod,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        currency,
        shipFullName: shipping.fullName,
        shipPhone: shipping.phone,
        shipRegion: shipping.region,
        shipCity: shipping.city,
        shipStreet: shipping.street,
        shipApartment: shipping.apartment ?? null,
        shipPostalCode: shipping.postalCode ?? null,
        note: input.note ?? null,
        items: { create: lines },
      },
      select: orderSelect,
    });

    // Per-product increments differ by quantity, so `updateMany` (one shared
    // value) cannot express this — the loop is required, not laziness.
    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { sold: { increment: line.quantity } },
      });
    }

    await tx.cartItem.deleteMany({
      where: { userId, variantId: { in: lines.map((l) => l.variantId) } },
    });

    return createdOrder;
  });

  // Fire-and-forget: the receipt must not be able to fail the checkout.
  const contact = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true },
  });
  if (contact?.phone || contact?.email) {
    void notifyOrderPlaced({
      identifier: contact.phone ?? contact.email!,
      type: contact.phone ? 'phone' : 'email',
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
    });
  }

  return order;
}

async function resolveShippingAddress(userId: string, input: CreateOrderInput) {
  if (input.address) return input.address;
  // Guard against `id: undefined`, which would match an arbitrary address.
  if (!input.addressId) throw new BadRequestError('A delivery address is required');

  const saved = await prisma.address.findFirst({
    where: { id: input.addressId, userId },
  });
  if (!saved) throw new NotFoundError('Address');

  return {
    fullName: saved.fullName,
    phone: saved.phone,
    region: saved.region,
    city: saved.city,
    street: saved.street,
    apartment: saved.apartment ?? undefined,
    postalCode: saved.postalCode ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listMyOrders(userId: string, query: ListOrdersQuery) {
  const params = resolvePage(query.page, query.limit);
  const where: Prisma.OrderWhereInput = { userId, ...(query.status ? { status: query.status } : {}) };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: orderSelect,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, meta: pageMeta(total, params) };
}

export async function getOrder(userId: string, orderId: string, isAdmin: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { ...orderSelect, userId: true },
  });

  if (!order) throw new NotFoundError('Order');
  if (order.userId !== userId && !isAdmin) throw new ForbiddenError('This order is not yours');

  const { userId: _ownerId, ...rest } = order;
  return rest;
}

export async function listAllOrders(query: AdminListOrdersQuery) {
  const params = resolvePage(query.page, query.limit);

  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q, mode: 'insensitive' } },
            { shipFullName: { contains: query.q, mode: 'insensitive' } },
            { shipPhone: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: {
        ...orderSelect,
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, meta: pageMeta(total, params) };
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** Returns reserved stock to the catalog. Used by both cancel paths. */
async function restock(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
  });

  for (const item of items) {
    if (!item.variantId) continue;
    await tx.productVariant.updateMany({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

export async function cancelOrder(userId: string, orderId: string, isAdmin: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });

  if (!order) throw new NotFoundError('Order');
  if (order.userId !== userId && !isAdmin) throw new ForbiddenError('This order is not yours');

  // Once it is on a courier's van, cancellation is a support conversation,
  // not a button.
  if (!isAdmin && !['PENDING', 'CONFIRMED'].includes(order.status)) {
    throw new ConflictError('This order can no longer be cancelled. Please contact support.');
  }
  if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
    throw new ConflictError(`Order is already ${order.status.toLowerCase()}`);
  }

  return prisma.$transaction(async (tx) => {
    await restock(tx, orderId);
    return tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      select: orderSelect,
    });
  });
}

export async function updateStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) throw new NotFoundError('Order');

  const allowed = ORDER_STATUS_FLOW[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestError(
      `Cannot move an order from ${order.status} to ${status}`,
      { allowed },
    );
  }

  return prisma.$transaction(async (tx) => {
    if (status === 'CANCELLED') await restock(tx, orderId);

    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        // Cash on delivery settles the moment the courier hands it over.
        ...(status === 'DELIVERED' ? { paymentStatus: 'PAID' as const } : {}),
      },
      select: orderSelect,
    });
  });
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED',
) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) throw new NotFoundError('Order');

  return prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus },
    select: orderSelect,
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orderCount, revenue, pending, customers, lowStock, recentOrders] = await prisma.$transaction([
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
    prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
        shipFullName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  return {
    period: '30d',
    orders: orderCount,
    revenue: revenue._sum.total ?? 0,
    pendingOrders: pending,
    customers,
    lowStockVariants: lowStock,
    recentOrders,
  };
}
