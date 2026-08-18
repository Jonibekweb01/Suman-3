import { asyncHandler, created, noContent, ok } from '../../core/http';
import * as categoryService from './category.service';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './category.schema';

export const list = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListCategoriesQuery;
  const categories = await categoryService.listCategories(query);
  ok(res, categories);
});

export const getBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug as string);
  ok(res, category);
});

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body as CreateCategoryInput);
  created(res, category);
});

export const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.id as string,
    req.body as UpdateCategoryInput,
  );
  ok(res, category);
});

export const remove = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id as string);
  noContent(res);
});
