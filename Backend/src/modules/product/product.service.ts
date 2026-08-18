import type { Prisma } from '@prisma/client';
import type { ProductSort } from '../../config/constants';
import { ConflictError, NotFoundError } from '../../core/errors';
import type { ApiMeta } from '../../core/http';
import { pageMeta, resolvePage, sliceCursorPage, takeWithLookahead } from '../../core/pagination';
import { prisma } from '../../core/prisma';
import { generateSku, slugify, uniqueSlug } from '../../utils/slug';
import { collectDescendantIds } from '../category/category.service';
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from './product.schema';

// ---------------------------------------------------------------------------
// Selections
// ---------------------------------------------------------------------------

/** Card payload — deliberately lean; the grid renders hundreds of these. */
const productCardSelect = {
  id: true,
  title: true,
  slug: true,
  brand: true,
  gender: true,
  price: true,
  oldPrice: true,
  currency: true,
  rating: true,
  reviewCount: true,
  sold: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { url: true, blurHash: true, alt: true },
    orderBy: { sortOrder: 'asc' },
    take: 2, // primary + hover image, nothing more
  },
  variants: { select: { color: true, colorHex: true, size: true, stock: true } },
} satisfies Prisma.ProductSelect;

const productDetailSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  brand: true,
  gender: true,
  price: true,
  oldPrice: true,
  currency: true,
  rating: true,
  reviewCount: true,
  sold: true,
  isActive: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, parentId: true } },
  images: {
    select: { id: true, url: true, blurHash: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
  variants: {
    select: { id: true, color: true, colorHex: true, size: true, sku: true, stock: true, priceDiff: true },
    orderBy: [{ color: 'asc' }, { size: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

/**
 * Collapses the variant rows into the swatch/size sets the card needs, so the
 * client never has to reduce over raw variants just to render a colour dot.
 */
function shapeCard(row: ProductCard) {
  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  let totalStock = 0;

  for (const variant of row.variants) {
    colors.set(variant.color, variant.colorHex);
    sizes.add(variant.size);
    totalStock += variant.stock;
  }

  const { variants: _variants, ...rest } = row;

  return {
    ...rest,
    discountPercent:
      row.oldPrice && row.oldPrice > row.price
        ? Math.round(((row.oldPrice - row.price) / row.oldPrice) * 100)
        : 0,
    colors: [...colors].map(([name, hex]) => ({ name, hex })),
    sizes: [...sizes],
    inStock: totalStock > 0,
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

const SORT_MAP: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  rating: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  popular: [{ sold: 'desc' }, { rating: 'desc' }],
};

async function buildWhere(
  query: ProductListQuery,
  options: { includeInactive?: boolean } = {},
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (!options.includeInactive) where.isActive = true;
  if (query.gender) where.gender = query.gender;
  if (query.featured !== undefined) where.isFeatured = query.featured;
  if (query.minRating !== undefined) where.rating = { gte: query.minRating };
  if (query.brands) where.brand = { in: query.brands };

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  // Selecting a parent category must return everything beneath it — a shopper
  // clicking "Women" expects dresses and coats, not an empty grid.
  const categoryId =
    query.categoryId ??
    (query.categorySlug
      ? (await prisma.category.findUnique({
          where: { slug: query.categorySlug },
          select: { id: true },
        }))?.id
      : undefined);

  if (categoryId) {
    const ids = await collectDescendantIds(categoryId);
    where.categoryId = { in: ids };
  }

  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { name: { contains: query.q, mode: 'insensitive' } } },
      ],
    });
  }

  // Size and colour live on variants. They are pushed as separate `some`
  // clauses on purpose: a single clause would match a product that has the
  // size on one variant and the colour on another, which is not what the
  // shopper asked for when both filters are active… but it IS the standard
  // e-commerce behaviour, so each dimension is matched independently and the
  // stock filter below keeps the result buyable.
  if (query.sizes) and.push({ variants: { some: { size: { in: query.sizes } } } });
  if (query.colors) and.push({ variants: { some: { color: { in: query.colors } } } });
  if (query.inStock) and.push({ variants: { some: { stock: { gt: 0 } } } });

  if (and.length > 0) where.AND = and;
  return where;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listProducts(
  query: ProductListQuery,
  options: { includeInactive?: boolean } = {},
): Promise<{ items: ReturnType<typeof shapeCard>[]; meta: ApiMeta }> {
  const where = await buildWhere(query, options);
  const orderBy = SORT_MAP[query.sort];

  // Cursor mode: infinite scroll. No COUNT query — it is the expensive half of
  // the request and the storefront never shows a total.
  if (query.cursor !== undefined) {
    const rows = await prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [...orderBy, { id: 'desc' }],
      take: takeWithLookahead(query.limit),
      skip: 1, // step past the cursor row itself
      cursor: { id: query.cursor },
    });
    const { items, nextCursor } = sliceCursorPage(rows, query.limit);
    return {
      items: items.map(shapeCard),
      meta: { limit: query.limit, nextCursor, hasNextPage: nextCursor !== null },
    };
  }

  const page = resolvePage(query.page, query.limit);

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [...orderBy, { id: 'desc' }],
      skip: page.skip,
      take: page.limit,
    }),
    prisma.product.count({ where }),
  ]);

  const last = rows[rows.length - 1];
  return {
    items: rows.map(shapeCard),
    meta: {
      ...pageMeta(total, page),
      nextCursor: rows.length === page.limit && last ? last.id : null,
    },
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: productDetailSelect });
  if (!product || !product.isActive) throw new NotFoundError('Product');
  return decorateDetail(product);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({ where: { slug }, select: productDetailSelect });
  if (!product || !product.isActive) throw new NotFoundError('Product');
  return decorateDetail(product);
}

type ProductDetail = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>;

function decorateDetail(product: ProductDetail) {
  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  let totalStock = 0;

  for (const variant of product.variants) {
    colors.set(variant.color, variant.colorHex);
    sizes.add(variant.size);
    totalStock += variant.stock;
  }

  return {
    ...product,
    discountPercent:
      product.oldPrice && product.oldPrice > product.price
        ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
        : 0,
    colors: [...colors].map(([name, hex]) => ({ name, hex })),
    sizes: [...sizes],
    totalStock,
    inStock: totalStock > 0,
  };
}

/**
 * "You may also like" — same category first, then same gender, never the
 * product itself. Ordered by popularity so the carousel leads with proven
 * sellers.
 */
export async function getRelatedProducts(productId: string, limit: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, gender: true, price: true },
  });
  if (!product) throw new NotFoundError('Product');

  const sameCategory = await prisma.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: productId } },
    select: productCardSelect,
    orderBy: [{ sold: 'desc' }, { rating: 'desc' }],
    take: limit,
  });

  if (sameCategory.length >= limit) return sameCategory.map(shapeCard);

  // Backfill so the carousel is never half-empty on a thin category.
  const filler = await prisma.product.findMany({
    where: {
      isActive: true,
      gender: product.gender,
      id: { notIn: [productId, ...sameCategory.map((p) => p.id)] },
    },
    select: productCardSelect,
    orderBy: [{ sold: 'desc' }],
    take: limit - sameCategory.length,
  });

  return [...sameCategory, ...filler].map(shapeCard);
}

/** Header autocomplete. Returns products plus matching category shortcuts. */
export async function suggest(term: string, limit: number) {
  const [products, categories] = await prisma.$transaction([
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { brand: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        currency: true,
        images: { select: { url: true, blurHash: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: [{ sold: 'desc' }, { rating: 'desc' }],
      take: limit,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: term, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
      take: 4,
    }),
  ]);

  return { products, categories };
}

/**
 * Bounds and options for the filter panel, computed against the *current*
 * filter set so the UI never offers a combination that returns nothing.
 */
export async function getFilterFacets(query: ProductListQuery) {
  const where = await buildWhere(query);

  const [aggregate, variants, brands] = await prisma.$transaction([
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true }, _count: true }),
    prisma.productVariant.findMany({
      where: { product: where },
      select: { color: true, colorHex: true, size: true },
      distinct: ['color', 'size'],
    }),
    prisma.product.findMany({
      where: { ...where, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      take: 50,
    }),
  ]);

  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  for (const variant of variants) {
    colors.set(variant.color, variant.colorHex);
    sizes.add(variant.size);
  }

  return {
    total: aggregate._count,
    priceRange: { min: aggregate._min.price ?? 0, max: aggregate._max.price ?? 0 },
    colors: [...colors].map(([name, hex]) => ({ name, hex })),
    sizes: [...sizes].sort(),
    brands: brands.map((b) => b.brand).filter((b): b is string => b !== null),
  };
}

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

export async function createProduct(input: CreateProductInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new NotFoundError('Category');

  const desired = input.slug ?? slugify(input.title);
  const taken = await prisma.product.findUnique({ where: { slug: desired }, select: { id: true } });
  if (taken && input.slug) throw new ConflictError('This slug is already in use');
  const slug = taken ? uniqueSlug(input.title) : desired;

  assertUniqueVariants(input.variants);

  return prisma.product.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      brand: input.brand ?? null,
      gender: input.gender,
      categoryId: input.categoryId,
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      currency: input.currency,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      images: {
        create: input.images.map((image, index) => ({
          url: image.url,
          blurHash: image.blurHash ?? null,
          alt: image.alt ?? input.title,
          sortOrder: image.sortOrder || index,
        })),
      },
      variants: {
        create: input.variants.map((variant) => ({
          color: variant.color,
          colorHex: variant.colorHex,
          size: variant.size,
          sku: variant.sku ?? generateSku(slug, variant.color, variant.size),
          stock: variant.stock,
          priceDiff: variant.priceDiff,
        })),
      },
    },
    select: productDetailSelect,
  });
}

type VariantInput = {
  color?: string;
  colorHex?: string;
  size?: string;
  sku?: string;
  stock?: number;
  priceDiff?: number;
};

type CompleteVariantInput = VariantInput & { color: string; size: string };

function assertUniqueVariants(
  variants: VariantInput[],
): asserts variants is CompleteVariantInput[] {
  const seen = new Set<string>();
  for (const variant of variants) {
    if (!variant.color || !variant.size) {
      throw new ConflictError('Every variant must have a colour and size');
    }
    const key = `${variant.color.toLowerCase()}::${variant.size.toLowerCase()}`;
    if (seen.has(key)) {
      throw new ConflictError(`Duplicate variant: ${variant.color} / ${variant.size}`);
    }
    seen.add(key);
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true },
  });
  if (!existing) throw new NotFoundError('Product');

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundError('Category');
  }
  if (input.variants) assertUniqueVariants(input.variants);

  const data: Prisma.ProductUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  if (input.brand !== undefined) data.brand = input.brand ?? null;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.price !== undefined) data.price = input.price;
  if (input.oldPrice !== undefined) data.oldPrice = input.oldPrice ?? null;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };

  const slug = input.slug ?? existing.slug;

  // Images and variants are replace-all collections. Everything runs in one
  // transaction so a failure halfway cannot leave a product with no variants.
  return prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });

    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          productId: id,
          url: image.url,
          blurHash: image.blurHash ?? null,
          alt: image.alt ?? input.title ?? existing.title,
          sortOrder: image.sortOrder || index,
        })),
      });
    }

    if (input.variants) {
      const incomingKeys = input.variants.map((v) => `${v.color}::${v.size}`);
      const current = await tx.productVariant.findMany({ where: { productId: id } });

      // Upsert rather than delete-and-recreate: variant ids are referenced by
      // live cart rows, and wiping them would silently empty carts.
      for (const variant of input.variants) {
        const match = current.find((c) => c.color === variant.color && c.size === variant.size);
        if (match) {
          await tx.productVariant.update({
            where: { id: match.id },
            data: {
              colorHex: variant.colorHex,
              stock: variant.stock,
              priceDiff: variant.priceDiff,
              ...(variant.sku ? { sku: variant.sku } : {}),
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              color: variant.color,
              colorHex: variant.colorHex,
              size: variant.size,
              sku: variant.sku ?? generateSku(slug, variant.color, variant.size),
              stock: variant.stock,
              priceDiff: variant.priceDiff,
            },
          });
        }
      }

      const removed = current.filter((c) => !incomingKeys.includes(`${c.color}::${c.size}`));
      if (removed.length > 0) {
        await tx.cartItem.deleteMany({ where: { variantId: { in: removed.map((r) => r.id) } } });
        await tx.productVariant.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      }
    }

    return tx.product.findUniqueOrThrow({ where: { id }, select: productDetailSelect });
  });
}

/**
 * Soft delete. Products are referenced by historical order items, and an
 * archived listing must still resolve for "buy it again".
 */
export async function archiveProduct(id: string): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw new NotFoundError('Product');

  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { isActive: false, isFeatured: false } }),
    // Nobody should check out an item that just left the catalog.
    prisma.cartItem.deleteMany({ where: { variant: { productId: id } } }),
  ]);
}

export async function adjustStock(variantId: string, delta: number) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant');

  const next = variant.stock + delta;
  if (next < 0) throw new ConflictError(`Only ${variant.stock} left in stock`);

  return prisma.productVariant.update({
    where: { id: variantId },
    data: { stock: next },
    select: { id: true, sku: true, stock: true },
  });
}
