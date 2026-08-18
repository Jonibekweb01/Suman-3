import { Router } from 'express';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, slugParamSchema, validate } from '../../middlewares/validate.middleware';
import * as controller from './category.controller';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schema';

export const categoryRouter: Router = Router();

// --- Public ---------------------------------------------------------------
categoryRouter.get('/', validate({ query: listCategoriesQuerySchema }), controller.list);
categoryRouter.get('/:slug', validate({ params: slugParamSchema }), controller.getBySlug);

// --- Admin ----------------------------------------------------------------
const adminOnly = [authenticate, verifyAccountState, requireRole('ADMIN'), writeLimiter] as const;

categoryRouter.post('/', ...adminOnly, validate({ body: createCategorySchema }), controller.create);
categoryRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  controller.update,
);
categoryRouter.delete('/:id', ...adminOnly, validate({ params: idParamSchema }), controller.remove);
