import type { Category, Prisma } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors';
import { prisma } from '../../core/prisma';
import { slugify, uniqueSlug } from '../../utils/slug';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './category.schema';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  gender: Category['gender'];
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  children: CategoryNode[];
}

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  gender: true,
  imageUrl: true,
  parentId: true,
  sortOrder: true,
  isActive: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

function toNode(row: CategoryRow): CategoryNode {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    gender: row.gender,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    productCount: row._count.products,
    children: [],
  };
}

/**
 * Builds the tree in one pass over a single flat query.
 *
 * Recursive `include` in Prisma costs one query per level and caps out at a
 * fixed depth; the category tree is small enough to fetch whole and assemble
 * in memory, which is both faster and depth-agnostic.
 */
function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const row of rows) byId.set(row.id, toNode(row));

  const roots: CategoryNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRecursive = (nodes: CategoryNode[]): void => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) sortRecursive(node.children);
  };
  sortRecursive(roots);

  return roots;
}

export async function listCategories(query: ListCategoriesQuery): Promise<CategoryNode[]> {
  const where: Prisma.CategoryWhereInput = {};
  if (!query.includeInactive) where.isActive = true;
  // Gender-neutral parents must survive the filter, otherwise a gendered child
  // would be orphaned and never reach the tree.
  if (query.gender) where.OR = [{ gender: query.gender }, { gender: null }];

  const rows = await prisma.category.findMany({
    where,
    select: categorySelect,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  if (!query.tree) return rows.map(toNode);
  return buildTree(rows);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryNode & { breadcrumbs: Array<{ id: string; name: string; slug: string }> }> {
  const category = await prisma.category.findUnique({ where: { slug }, select: categorySelect });
  if (!category || !category.isActive) throw new NotFoundError('Category');

  const children = await prisma.category.findMany({
    where: { parentId: category.id, isActive: true },
    select: categorySelect,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  // Walk up to the root for the breadcrumb trail. Depth is 2–3 in practice;
  // the guard is there so a cyclic parentId cannot hang the request.
  const breadcrumbs: Array<{ id: string; name: string; slug: string }> = [];
  let cursor = category.parentId;
  let guard = 0;
  while (cursor && guard < 10) {
    const parent: { id: string; name: string; slug: string; parentId: string | null } | null =
      await prisma.category.findUnique({
        where: { id: cursor },
        select: { id: true, name: true, slug: true, parentId: true },
      });
    if (!parent) break;
    breadcrumbs.unshift({ id: parent.id, name: parent.name, slug: parent.slug });
    cursor = parent.parentId;
    guard += 1;
  }

  return { ...toNode(category), children: children.map(toNode), breadcrumbs };
}

/** Every descendant id, used to make a category filter include sub-categories. */
export async function collectDescendantIds(rootId: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });

  const childrenOf = new Map<string, string[]>();
  for (const row of all) {
    if (!row.parentId) continue;
    const bucket = childrenOf.get(row.parentId);
    if (bucket) bucket.push(row.id);
    else childrenOf.set(row.parentId, [row.id]);
  }

  const collected: string[] = [];
  const queue = [rootId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    collected.push(current);
    queue.push(...(childrenOf.get(current) ?? []));
  }

  return collected;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new NotFoundError('Parent category');
  }

  const desiredSlug = input.slug ?? slugify(input.name);
  const taken = await prisma.category.findUnique({ where: { slug: desiredSlug } });
  if (taken && input.slug) throw new ConflictError('This slug is already in use');

  return prisma.category.create({
    data: {
      name: input.name,
      slug: taken ? uniqueSlug(input.name) : desiredSlug,
      gender: input.gender ?? null,
      imageUrl: input.imageUrl ?? null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Category');

  if (input.parentId) {
    if (input.parentId === id) throw new BadRequestError('A category cannot be its own parent');
    // Reparenting under one's own descendant would create a cycle that the
    // tree builder and breadcrumb walk cannot represent.
    const descendants = await collectDescendantIds(id);
    if (descendants.includes(input.parentId)) {
      throw new BadRequestError('Cannot move a category under its own descendant');
    }
  }

  const data: Prisma.CategoryUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.gender !== undefined) data.gender = input.gender ?? null;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl ?? null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.parentId !== undefined) {
    data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
  }

  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { _count: { select: { products: true, children: true } } },
  });
  if (!category) throw new NotFoundError('Category');

  if (category._count.products > 0) {
    throw new ConflictError(
      `Cannot delete: ${category._count.products} product(s) still reference this category`,
    );
  }
  if (category._count.children > 0) {
    throw new ConflictError('Cannot delete: move or remove the sub-categories first');
  }

  await prisma.category.delete({ where: { id } });
}
