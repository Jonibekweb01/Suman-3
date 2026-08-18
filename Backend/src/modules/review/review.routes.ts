import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, created, noContent, ok } from '../../core/http';
import { authenticate } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, validate } from '../../middlewares/validate.middleware';
import { sanitizeText } from '../../utils/sanitize';
import * as reviewService from './review.service';

export const reviewRouter: Router = Router();

const productIdParamSchema = z.object({ productId: z.string().cuid('Invalid product') });

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const upsertReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Keep it under 1000 characters')
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
});

reviewRouter.get(
  '/product/:productId',
  validate({ params: productIdParamSchema, query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const { items, meta } = await reviewService.listReviews(req.params.productId as string, page, limit);
    ok(res, items, meta);
  }),
);

reviewRouter.put(
  '/product/:productId',
  authenticate,
  writeLimiter,
  validate({ params: productIdParamSchema, body: upsertReviewSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertReviewSchema>;
    const review = await reviewService.upsertReview(
      req.user!.id,
      req.params.productId as string,
      body,
    );
    created(res, review);
  }),
);

reviewRouter.delete(
  '/:id',
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await reviewService.deleteReview(req.user!.id, req.params.id as string, req.user!.role === 'ADMIN');
    noContent(res);
  }),
);
