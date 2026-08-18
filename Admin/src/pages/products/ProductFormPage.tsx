import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useFlatCategories } from '../../entities/category/api';
import { productApi, type ProductPayload, type VariantInput } from '../../entities/product/api';
import { ImageUploader } from '../../features/image-upload/ImageUploader';
import { queryKeys } from '../../shared/api/queryKeys';
import { ApiError } from '../../shared/api/types';
import { slugify, toMajorUnits, toMinorUnits } from '../../shared/lib/utils';
import {
  Button,
  Checkbox,
  ErrorBanner,
  IconChevronLeft,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../shared/ui';
import { PageHeader } from '../../app/layouts/AdminLayout';
import { VariantMatrix, stockKey, type VariantMatrixValue } from './VariantMatrix';

/**
 * Prices are entered in major units (so'm) because that is how a merchandiser
 * thinks; `toMinorUnits` converts on submit. Doing it the other way round
 * would mean asking someone to type 24900000 for 249 000 so'm.
 */
const formSchema = z
  .object({
    title: z.string().trim().min(2, 'At least 2 characters').max(140),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]*$/, 'Lowercase letters, digits and hyphens only')
      .max(120)
      .optional(),
    description: z.string().trim().min(10, 'At least 10 characters').max(5000),
    brand: z.string().trim().max(60).optional(),
    gender: z.enum(['WOMEN', 'MEN', 'UNISEX', 'KIDS']),
    categoryId: z.string().min(1, 'Choose a category'),
    price: z.coerce.number().positive('Must be greater than zero'),
    oldPrice: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    currency: z.string().length(3),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
  })
  // An empty compare-at price is falsy, so the first clause covers both
  // "not set" and the empty-string case the union allows.
  .refine(
    (data) => !data.oldPrice || Number(data.oldPrice) > data.price,
    {
      // A "was" price at or below the current one renders as a −0% badge and
      // looks like a bug on the storefront.
      message: 'The compare-at price must be higher than the selling price',
      path: ['oldPrice'],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const GENDER_OPTIONS = [
  { value: 'WOMEN', label: 'Women' },
  { value: 'MEN', label: 'Men' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
];

const EMPTY_MATRIX: VariantMatrixValue = { colors: [], sizes: [], stock: {} };

/** Fields this form renders a control for — used to route server field errors. */
const FORM_FIELDS: Array<keyof FormValues> = [
  'title',
  'slug',
  'description',
  'brand',
  'gender',
  'categoryId',
  'price',
  'oldPrice',
  'currency',
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'new');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);
  const { flat: categories, isLoading: categoriesLoading } = useFlatCategories();

  const [images, setImages] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<VariantMatrixValue>(EMPTY_MATRIX);
  const [formError, setFormError] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productApi.detail(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      brand: '',
      gender: 'UNISEX',
      categoryId: '',
      price: 0,
      oldPrice: '',
      currency: 'UZS',
      isActive: true,
      isFeatured: false,
    },
  });

  // Hydrate once the product arrives, projecting its flat variant list back
  // into the two-axis matrix the editor works with.
  useEffect(() => {
    if (!product) return;

    reset({
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand ?? '',
      gender: product.gender,
      categoryId: product.category.id,
      price: toMajorUnits(product.price),
      oldPrice: product.oldPrice ? toMajorUnits(product.oldPrice) : '',
      currency: product.currency,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });

    setImages(product.images.map((image) => image.url));

    const colors = new Map<string, string>();
    const sizes: string[] = [];
    const stock: Record<string, number> = {};

    for (const variant of product.variants) {
      colors.set(variant.color, variant.colorHex);
      if (!sizes.includes(variant.size)) sizes.push(variant.size);
      stock[stockKey(variant.color, variant.size)] = variant.stock;
    }

    setMatrix({
      colors: [...colors].map(([name, hex]) => ({ name, hex })),
      sizes,
      stock,
    });
  }, [product, reset]);

  const title = watch('title');

  const save = useMutation({
    mutationFn: (payload: ProductPayload) =>
      isEdit ? productApi.update(id!, payload) : productApi.create(payload),

    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      pushToast(isEdit ? 'Product updated' : 'Product created');
      navigate(`/products/${saved.id}`, { replace: true });
    },

    onError: (error: Error) => {
      if (error instanceof ApiError) {
        // Map only the server fields this form actually renders; anything else
        // (a variant or image issue) surfaces in the banner instead of being
        // silently attached to a control the admin cannot see.
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (FORM_FIELDS.includes(field as keyof FormValues)) {
            setError(field as keyof FormValues, { message });
          }
        }
        const validationDetails = Object.entries(error.fieldErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(' | ');
        setFormError(validationDetails ? `${error.message}: ${validationDetails}` : error.message);
        return;
      }
      setFormError('Could not save the product');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setAssetError(null);

    // The API rejects an empty images/variants array; catching it here gives a
    // pointed message instead of a generic 422.
    if (images.length === 0) {
      setAssetError('Add at least one image');
      return;
    }
    if (matrix.colors.length === 0 || matrix.sizes.length === 0) {
      setAssetError('Add at least one colour and one size');
      return;
    }

    const variants: VariantInput[] = matrix.colors.flatMap((color) =>
      matrix.sizes.map((size) => ({
        color: color.name,
        colorHex: color.hex,
        size,
        stock: matrix.stock[stockKey(color.name, size)] ?? 0,
        priceDiff: 0,
      })),
    );

    const payload: ProductPayload = {
      title: values.title,
      description: values.description,
      gender: values.gender,
      categoryId: values.categoryId,
      price: toMinorUnits(values.price),
      oldPrice: values.oldPrice ? toMinorUnits(Number(values.oldPrice)) : null,
      currency: values.currency,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      images: images.map((url, index) => ({ url, sortOrder: index, alt: values.title })),
      variants,
      ...(values.slug ? { slug: values.slug } : {}),
      ...(values.brand ? { brand: values.brand } : {}),
    };

    save.mutate(payload);
  });

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? (product?.title ?? 'Edit product') : 'New product'}
        description={isEdit ? 'Changes go live on the storefront immediately.' : undefined}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<IconChevronLeft size={15} />}
              onClick={() => navigate('/products')}
            >
              Back
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      {formError && <ErrorBanner message={formError} className="mb-4" />}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Section title="Details">
            <Input
              {...register('title')}
              label="Title"
              required
              error={errors.title?.message}
              placeholder="Silk Midi Dress"
            />

            <Input
              {...register('slug')}
              label="URL slug"
              error={errors.slug?.message}
              hint="Leave blank to generate from the title."
              placeholder={title ? slugify(title) : 'silk-midi-dress'}
            />

            <Textarea
              {...register('description')}
              label="Description"
              required
              rows={5}
              error={errors.description?.message}
              placeholder="Materials, fit, care instructions…"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input {...register('brand')} label="Brand" placeholder="Suman Atelier" />
              <Select
                {...register('gender')}
                label="Department"
                options={GENDER_OPTIONS}
                error={errors.gender?.message}
              />
            </div>

            <Select
              {...register('categoryId')}
              label="Category"
              required
              placeholder={categoriesLoading ? 'Loading…' : 'Choose a category'}
              options={categories.map((category) => ({
                value: category.id,
                label: category.label,
              }))}
              error={errors.categoryId?.message}
            />
          </Section>

          <Section
            title="Variants"
            description="Define the colours and sizes; every combination becomes a purchasable variant."
          >
            <VariantMatrix value={matrix} onChange={setMatrix} />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Pricing">
            <Input
              {...register('price')}
              label="Price"
              type="number"
              min={0}
              step={1000}
              required
              error={errors.price?.message}
              hint="In so'm, not tiyin."
            />

            <Input
              {...register('oldPrice')}
              label="Compare-at price"
              type="number"
              min={0}
              step={1000}
              error={typeof errors.oldPrice?.message === 'string' ? errors.oldPrice.message : undefined}
              hint="Shown struck through. Leave blank for no discount."
            />

            <Select
              {...register('currency')}
              label="Currency"
              options={[
                { value: 'UZS', label: 'UZS — so‘m' },
                { value: 'USD', label: 'USD — dollar' },
              ]}
            />
          </Section>

          <Section title="Media">
            <ImageUploader
              urls={images}
              onChange={setImages}
              max={12}
              label="Product images"
              hint="The first image is the storefront thumbnail."
            />
          </Section>

          <Section title="Visibility">
            <Checkbox
              {...register('isActive')}
              label="Active"
              hint="Visible and purchasable on the storefront."
            />
            <Checkbox
              {...register('isFeatured')}
              label="Featured"
              hint="Eligible for the featured rail on the home page."
            />
          </Section>
        </div>
      </div>

      {assetError && <ErrorBanner message={assetError} className="mt-4" />}

      <div className="mt-5 flex items-center justify-end gap-2">
        {isDirty && <span className="text-[13px] text-muted">Unsaved changes</span>}
        <Button variant="secondary" onClick={() => navigate('/products')}>
          Cancel
        </Button>
        <Button type="submit" isLoading={save.isPending}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
