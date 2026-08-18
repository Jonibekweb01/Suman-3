import { Router } from 'express';
import { asyncHandler, created, ok } from '../../core/http';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, validate } from '../../middlewares/validate.middleware';
import * as orderService from './order.service';
import {
  adminListOrdersQuerySchema,
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  type AdminListOrdersQuery,
  type CreateOrderInput,
  type ListOrdersQuery,
} from './order.schema';

export const orderRouter: Router = Router();

const adminOnly = [authenticate, verifyAccountState, requireRole('ADMIN')] as const;

// --- Admin (declared first: `/admin/...` must not be eaten by `/:id`) ------
orderRouter.get(
  '/admin/stats',
  ...adminOnly,
  asyncHandler(async (_req, res) => {
    ok(res, await orderService.getDashboardStats());
  }),
);

orderRouter.get(
  '/admin/all',
  ...adminOnly,
  validate({ query: adminListOrdersQuerySchema }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await orderService.listAllOrders(
      req.query as unknown as AdminListOrdersQuery,
    );
    ok(res, items, meta);
  }),
);

orderRouter.patch(
  '/:id/status',
  ...adminOnly,
  validate({ params: idParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { status: Parameters<typeof orderService.updateStatus>[1] };
    ok(res, await orderService.updateStatus(req.params.id as string, body.status));
  }),
);

orderRouter.patch(
  '/:id/payment',
  ...adminOnly,
  validate({ params: idParamSchema, body: updatePaymentStatusSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED' };
    ok(res, await orderService.updatePaymentStatus(req.params.id as string, body.paymentStatus));
  }),
);

// --- Customer --------------------------------------------------------------
orderRouter.post(
  '/',
  authenticate,
  verifyAccountState,
  writeLimiter,
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    created(res, await orderService.createOrder(req.user!.id, req.body as CreateOrderInput));
  }),
);

orderRouter.get(
  '/',
  authenticate,
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await orderService.listMyOrders(
      req.user!.id,
      req.query as unknown as ListOrdersQuery,
    );
    ok(res, items, meta);
  }),
);

orderRouter.get(
  '/:id',
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(
      res,
      await orderService.getOrder(req.user!.id, req.params.id as string, req.user!.role === 'ADMIN'),
    );
  }),
);

orderRouter.post(
  '/:id/cancel',
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(
      res,
      await orderService.cancelOrder(req.user!.id, req.params.id as string, req.user!.role === 'ADMIN'),
    );
  }),
);
