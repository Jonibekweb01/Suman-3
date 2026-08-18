import { Router } from 'express';
import { z } from 'zod';
import { NotFoundError } from '../../core/errors';
import { asyncHandler, created, noContent, ok } from '../../core/http';
import { prisma } from '../../core/prisma';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rateLimit.middleware';
import { idParamSchema, validate } from '../../middlewares/validate.middleware';
import { sanitizeText } from '../../utils/sanitize';

export const bannerRouter: Router = Router();

const bannerSchema = z.object({
  title: z.string().trim().min(2).max(120).transform(sanitizeText),
  subtitle: z.string().trim().max(200).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  imageUrl: z.string().url().max(500),
  mobileImageUrl: z.string().url().max(500).optional(),
  link: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

const updateBannerSchema = bannerSchema.partial();

const adminOnly = [authenticate, verifyAccountState, requireRole('ADMIN'), writeLimiter] as const;

/**
 * Hero carousel. Scheduling is evaluated at read time so a campaign can be
 * queued in advance and expires on its own.
 */
bannerRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    ok(res, banners);
  }),
);

bannerRouter.get(
  '/admin/all',
  ...adminOnly,
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }));
  }),
);

bannerRouter.post(
  '/',
  ...adminOnly,
  validate({ body: bannerSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof bannerSchema>;
    created(
      res,
      await prisma.banner.create({
        data: {
          title: body.title,
          subtitle: body.subtitle ?? null,
          imageUrl: body.imageUrl,
          mobileImageUrl: body.mobileImageUrl ?? null,
          link: body.link ?? null,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          startsAt: body.startsAt ?? null,
          endsAt: body.endsAt ?? null,
        },
      }),
    );
  }),
);

bannerRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: idParamSchema, body: updateBannerSchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new NotFoundError('Banner');

    ok(
      res,
      await prisma.banner.update({
        where: { id: req.params.id as string },
        data: req.body as z.infer<typeof updateBannerSchema>,
      }),
    );
  }),
);

bannerRouter.delete(
  '/:id',
  ...adminOnly,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id as string } });
    noContent(res);
  }),
);
