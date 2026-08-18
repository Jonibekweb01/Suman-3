import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, noContent, ok } from '../../core/http';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as wishlistService from './wishlist.service';

export const wishlistRouter: Router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
});

const productIdParamSchema = z.object({ productId: z.string().cuid('Invalid product') });

const checkSchema = z.object({
  productIds: z.array(z.string().cuid()).max(100),
});

wishlistRouter.use(authenticate);

wishlistRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const { items, meta } = await wishlistService.listWishlist(req.user!.id, page, limit);
    ok(res, items, meta);
  }),
);

wishlistRouter.get(
  '/count',
  asyncHandler(async (req, res) => {
    ok(res, { count: await wishlistService.getWishlistCount(req.user!.id) });
  }),
);

wishlistRouter.post(
  '/check',
  validate({ body: checkSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof checkSchema>;
    ok(res, { productIds: await wishlistService.getWishlistedIds(req.user!.id, body.productIds) });
  }),
);

wishlistRouter.post(
  '/:productId/toggle',
  validate({ params: productIdParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await wishlistService.toggleWishlist(req.user!.id, req.params.productId as string));
  }),
);

wishlistRouter.delete(
  '/:productId',
  validate({ params: productIdParamSchema }),
  asyncHandler(async (req, res) => {
    await wishlistService.removeFromWishlist(req.user!.id, req.params.productId as string);
    noContent(res);
  }),
);
