import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './cart.controller';
import {
  addToCartSchema,
  mergeCartSchema,
  updateCartItemSchema,
  variantIdParamSchema,
} from './cart.schema';

export const cartRouter: Router = Router();

// The whole cart is per-user state — nothing here is public.
cartRouter.use(authenticate);

cartRouter.get('/', controller.get);
cartRouter.get('/count', controller.count);
cartRouter.post('/items', validate({ body: addToCartSchema }), controller.add);
cartRouter.post('/merge', validate({ body: mergeCartSchema }), controller.merge);
cartRouter.patch(
  '/items/:variantId',
  validate({ params: variantIdParamSchema, body: updateCartItemSchema }),
  controller.update,
);
cartRouter.delete('/items/:variantId', validate({ params: variantIdParamSchema }), controller.remove);
cartRouter.delete('/', controller.clear);
