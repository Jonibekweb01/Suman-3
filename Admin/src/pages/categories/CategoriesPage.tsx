import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  categoryApi,
  flattenCategories,
  useCategoryTree,
  type CategoryPayload,
} from '../../entities/category/api';
import { ImageUploader } from '../../features/image-upload/ImageUploader';
import { queryKeys } from '../../shared/api/queryKeys';
import { ApiError } from '../../shared/api/types';
import { useConfirm } from '../../shared/lib/hooks';
import { cn, slugify } from '../../shared/lib/utils';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  Modal,
  Select,
  Skeleton,
  useToast,
} from '../../shared/ui';
import type { Category } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';

const categorySchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, digits and hyphens only')
    .max(80)
    .optional(),
  gender: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

type CategoryValues = z.infer<typeof categorySchema>;

const GENDER_OPTIONS = [
  { value: 'WOMEN', label: 'Women' },
  { value: 'MEN', label: 'Men' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
];

/** Recursive row — the tree is 2–3 deep in practice. */
function CategoryRow({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: Category;
  depth: number;
  onEdit: (node: Category) => void;
  onDelete: (node: Category) => void;
}) {
  return (
    <>
      <li
        className={cn(
          'flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0',
          depth > 0 && 'bg-canvas/50',
        )}
      >
        <span style={{ paddingLeft: depth * 20 }} className="flex min-w-0 flex-1 items-center gap-2.5">
          {node.imageUrl ? (
            <img
              src={node.imageUrl}
              alt=""
              loading="lazy"
              className="size-8 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="size-8 shrink-0 rounded bg-sunken" />
          )}

          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{node.name}</span>
              {node.gender && <Badge tone="neutral">{node.gender.toLowerCase()}</Badge>}
            </span>
            <span className="block truncate font-mono text-[12px] text-muted">/{node.slug}</span>
          </span>
        </span>

        <span className="hidden shrink-0 text-[13px] text-muted sm:block">
          {node.productCount} product{node.productCount === 1 ? '' : 's'}
        </span>

        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(node)}
            aria-label={`Edit ${node.name}`}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <IconEdit size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            aria-label={`Delete ${node.name}`}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={16} />
          </button>
        </span>
      </li>

      {node.children.map((child) => (
        <CategoryRow key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);
  const { data: tree, isLoading } = useCategoryTree();

  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const confirmDelete = useConfirm<Category>();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', gender: '', parentId: '', sortOrder: 0, isActive: true },
  });

  const name = watch('name');
  const flat = tree ? flattenCategories(tree) : [];

  useEffect(() => {
    if (!isFormOpen) return;

    if (editing) {
      reset({
        name: editing.name,
        slug: editing.slug,
        gender: editing.gender ?? '',
        parentId: editing.parentId ?? '',
        sortOrder: editing.sortOrder,
        isActive: true,
      });
      setImageUrl(editing.imageUrl ? [editing.imageUrl] : []);
    } else {
      reset({ name: '', slug: '', gender: '', parentId: '', sortOrder: 0, isActive: true });
      setImageUrl([]);
    }
    setFormError(null);
  }, [isFormOpen, editing, reset]);

  const save = useMutation({
    mutationFn: (payload: CategoryPayload) =>
      editing ? categoryApi.update(editing.id, payload) : categoryApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      setFormOpen(false);
      setEditing(null);
      pushToast(editing ? 'Category updated' : 'Category created');
    },
    onError: (error: Error) =>
      setFormError(error instanceof ApiError ? error.message : 'Could not save the category'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => categoryApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      confirmDelete.dismiss();
      pushToast('Category deleted');
    },
    // The API refuses to delete a category that still has products or children,
    // and its message names the exact count — pass it straight through.
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    save.mutate({
      name: values.name,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      gender: values.gender ? (values.gender as CategoryPayload['gender']) : null,
      parentId: values.parentId || null,
      imageUrl: imageUrl[0] ?? null,
      ...(values.slug ? { slug: values.slug } : {}),
    });
  });

  // A category cannot be its own parent, nor be nested under a descendant —
  // the API rejects it, so do not offer it.
  const parentOptions = flat
    .filter((candidate) => {
      if (!editing) return true;
      if (candidate.id === editing.id) return false;
      return !candidate.label.startsWith(`${editing.name} ›`);
    })
    .map((candidate) => ({ value: candidate.id, label: candidate.label }));

  return (
    <>
      <PageHeader
        title="Categories"
        description="The navigation tree behind the storefront's filters."
        actions={
          <Button
            leftIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New category
          </Button>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !tree || tree.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create a top-level category such as Women or Men, then add sub-categories beneath it."
            action={
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New category
              </Button>
            }
          />
        ) : (
          <ul>
            {tree.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                depth={0}
                onEdit={(category) => {
                  setEditing(category);
                  setFormOpen(true);
                }}
                onDelete={confirmDelete.request}
              />
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New category'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} isLoading={save.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError && <ErrorBanner message={formError} />}

          <Input {...register('name')} label="Name" required error={errors.name?.message} autoFocus />

          <Input
            {...register('slug')}
            label="URL slug"
            error={errors.slug?.message}
            hint="Leave blank to generate from the name."
            placeholder={name ? slugify(name) : 'women-dresses'}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              {...register('parentId')}
              label="Parent"
              options={parentOptions}
              placeholder="None — top level"
            />
            <Select
              {...register('gender')}
              label="Department"
              options={GENDER_OPTIONS}
              placeholder="Any"
            />
          </div>

          <Input
            {...register('sortOrder')}
            label="Sort order"
            type="number"
            min={0}
            error={errors.sortOrder?.message}
            hint="Lower numbers appear first."
          />

          <ImageUploader urls={imageUrl} onChange={setImageUrl} single label="Tile image" />

          <Checkbox {...register('isActive')} label="Active" hint="Visible on the storefront." />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete.isOpen}
        onClose={confirmDelete.dismiss}
        onConfirm={() => confirmDelete.pending && remove.mutate(confirmDelete.pending.id)}
        title="Delete category"
        message={`Delete "${confirmDelete.pending?.name}"? This only works if it has no products and no sub-categories.`}
        confirmLabel="Delete"
        destructive
        isLoading={remove.isPending}
      />
    </>
  );
}
