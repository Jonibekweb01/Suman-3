import { Router } from 'express';
import { env } from '../config/env';
import { ok } from '../core/http';
import { prisma } from '../core/prisma';
import { authRouter } from '../modules/auth/auth.routes';
import { bannerRouter } from '../modules/banner/banner.routes';
import { cartRouter } from '../modules/cart/cart.routes';
import { categoryRouter } from '../modules/category/category.routes';
import { orderRouter } from '../modules/order/order.routes';
import { productRouter } from '../modules/product/product.routes';
import { reviewRouter } from '../modules/review/review.routes';
import { uploadRouter } from '../modules/upload/upload.routes';
import { userRouter } from '../modules/user/user.routes';
import { wishlistRouter } from '../modules/wishlist/wishlist.routes';

export const apiRouter: Router = Router();

/**
 * Liveness + readiness in one. A failing database means the instance cannot
 * serve traffic, so the probe must reflect that rather than always returning
 * 200.
 */
apiRouter.get('/health', async (_req, res) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, {
      status: 'ok',
      environment: env.NODE_ENV,
      database: { status: 'up', latencyMs: Date.now() - startedAt },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unreachable' },
    });
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/banners', bannerRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/uploads', uploadRouter);
