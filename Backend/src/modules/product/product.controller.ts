import { asyncHandler, created, noContent, ok } from '../../core/http';
import * as productService from './product.service';
import type {
  CreateProductInput,
  ProductListQuery,
  SearchSuggestQuery,
  UpdateProductInput,
} from './product.schema';

export const list = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ProductListQuery;
  const { items, meta } = await productService.listProducts(query);
  ok(res, items, meta);
});

/** Admin listing — includes archived rows the storefront must not see. */
export const listAll = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ProductListQuery;
  const { items, meta } = await productService.listProducts(query, { includeInactive: true });
  ok(res, items, meta);
});

export const facets = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ProductListQuery;
  ok(res, await productService.getFilterFacets(query));
});

export const suggest = asyncHandler(async (req, res) => {
  const { q, limit } = req.query as unknown as SearchSuggestQuery;
  ok(res, await productService.suggest(q, limit));
});

export const getById = asyncHandler(async (req, res) => {
  ok(res, await productService.getProductById(req.params.id as string));
});

export const getBySlug = asyncHandler(async (req, res) => {
  ok(res, await productService.getProductBySlug(req.params.slug as string));
});

export const related = asyncHandler(async (req, res) => {
  const { limit } = req.query as unknown as { limit: number };
  ok(res, await productService.getRelatedProducts(req.params.id as string, limit));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await productService.createProduct(req.body as CreateProductInput));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await productService.updateProduct(req.params.id as string, req.body as UpdateProductInput));
});

export const archive = asyncHandler(async (req, res) => {
  await productService.archiveProduct(req.params.id as string);
  noContent(res);
});

export const adjustStock = asyncHandler(async (req, res) => {
  const body = req.body as { variantId: string; delta: number };
  ok(res, await productService.adjustStock(body.variantId, body.delta));
});
