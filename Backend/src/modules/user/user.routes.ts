import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, created, noContent, ok } from '../../core/http';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, validate } from '../../middlewares/validate.middleware';
import { sanitizeText } from '../../utils/sanitize';
import { createAddressSchema, updateAddressSchema } from '../order/order.schema';
import type { CreateAddressInput, UpdateAddressInput } from '../order/order.schema';
import * as userService from './user.service';

export const userRouter: Router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).transform(sanitizeText).optional(),
  lastName: z.string().trim().max(50).transform(sanitizeText).nullish(),
  avatarUrl: z.string().url().max(500).nullish(),
});

const adminListUsersSchema = z.object({
  q: z.string().trim().max(60).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const blockSchema = z.object({ isBlocked: z.boolean() });

userRouter.use(authenticate);

// --- Profile ---------------------------------------------------------------
userRouter.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await userService.updateProfile(req.user!.id, req.body as z.infer<typeof updateProfileSchema>));
  }),
);

userRouter.delete(
  '/me',
  verifyAccountState,
  asyncHandler(async (req, res) => {
    ok(res, await userService.deleteAccount(req.user!.id));
  }),
);

// --- Addresses -------------------------------------------------------------
userRouter.get(
  '/me/addresses',
  asyncHandler(async (req, res) => {
    ok(res, await userService.listAddresses(req.user!.id));
  }),
);

userRouter.post(
  '/me/addresses',
  writeLimiter,
  validate({ body: createAddressSchema }),
  asyncHandler(async (req, res) => {
    created(res, await userService.createAddress(req.user!.id, req.body as CreateAddressInput));
  }),
);

userRouter.patch(
  '/me/addresses/:id',
  validate({ params: idParamSchema, body: updateAddressSchema }),
  asyncHandler(async (req, res) => {
    ok(
      res,
      await userService.updateAddress(
        req.user!.id,
        req.params.id as string,
        req.body as UpdateAddressInput,
      ),
    );
  }),
);

userRouter.delete(
  '/me/addresses/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await userService.deleteAddress(req.user!.id, req.params.id as string);
    noContent(res);
  }),
);

// --- Admin -----------------------------------------------------------------
userRouter.get(
  '/',
  verifyAccountState,
  requireRole('ADMIN'),
  validate({ query: adminListUsersSchema }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await userService.listUsers(
      req.query as unknown as z.infer<typeof adminListUsersSchema>,
    );
    ok(res, items, meta);
  }),
);

userRouter.patch(
  '/:id/block',
  verifyAccountState,
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: blockSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof blockSchema>;
    ok(res, await userService.setBlocked(req.params.id as string, body.isBlocked));
  }),
);
