import { Router } from 'express';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';
import { searchLimiter, writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, slugParamSchema, validate } from '../../middlewares/validate.middleware';
import * as controller from './product.controller';
import {
  createProductSchema,
  productListQuerySchema,
  relatedQuerySchema,
  searchSuggestQuerySchema,
  stockAdjustSchema,
  updateProductSchema,
} from './product.schema';

export const productRouter: Router = Router();

const adminOnly = [authenticate, verifyAccountState, requireRole('ADMIN'), writeLimiter] as const;

// --- Static segments first -------------------------------------------------
// `/suggest` and `/facets` must be declared before `/:id`, otherwise Express
// would match them as an id.
productRouter.get(
  '/suggest',
  searchLimiter,
  validate({ query: searchSuggestQuerySchema }),
  controller.suggest,
);
productRouter.get('/facets', validate({ query: productListQuerySchema }), controller.facets);
productRouter.get(
  '/admin/all',
  ...adminOnly,
  validate({ query: productListQuerySchema }),
  controller.listAll,
);

// --- Public ----------------------------------------------------------------
productRouter.get('/', validate({ query: productListQuerySchema }), controller.list);
productRouter.get('/slug/:slug', validate({ params: slugParamSchema }), controller.getBySlug);
productRouter.get(
  '/:id/related',
  validate({ params: idParamSchema, query: relatedQuerySchema }),
  controller.related,
);
productRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);

// --- Admin -----------------------------------------------------------------
productRouter.post('/', ...adminOnly, validate({ body: createProductSchema }), controller.create);
productRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: idParamSchema, body: updateProductSchema }),
  controller.update,
);
productRouter.delete('/:id', ...adminOnly, validate({ params: idParamSchema }), controller.archive);
productRouter.post(
  '/stock/adjust',
  ...adminOnly,
  validate({ body: stockAdjustSchema }),
  controller.adjustStock,
);
