import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { bannerApi, type BannerPayload } from '../../entities/banner/api';
import { ImageUploader } from '../../features/image-upload/ImageUploader';
import { queryKeys } from '../../shared/api/queryKeys';
import { ApiError } from '../../shared/api/types';
import { useConfirm } from '../../shared/lib/hooks';
import { formatDate, toDateTimeLocal } from '../../shared/lib/utils';
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
  Skeleton,
  Textarea,
  useToast,
} from '../../shared/ui';
import type { Banner } from '../../shared/types';
import { PageHeader } from '../../app/layouts/AdminLayout';

const bannerSchema = z
  .object({
    title: z.string().trim().min(2, 'At least 2 characters').max(120),
    subtitle: z.string().trim().max(200).optional(),
    link: z.string().trim().max(500).optional(),
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine(
    (data) => !data.startsAt || !data.endsAt || new Date(data.startsAt) < new Date(data.endsAt),
    { message: 'The end date must be after the start date', path: ['endsAt'] },
  );

type BannerValues = z.infer<typeof bannerSchema>;

/**
 * A banner is live only when it is active AND inside its scheduling window.
 * Showing that as one derived state saves the admin from mentally intersecting
 * three fields to answer "is this on the site right now?".
 */
function liveState(banner: Banner): { label: string; tone: 'success' | 'neutral' | 'warning' } {
  if (!banner.isActive) return { label: 'Inactive', tone: 'neutral' };

  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return { label: 'Scheduled', tone: 'warning' };
  }
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) {
    return { label: 'Expired', tone: 'neutral' };
  }
  return { label: 'Live', tone: 'success' };
}

export default function BannersPage() {
  const queryClient = useQueryClient();
  const pushToast = useToast((state) => state.push);

  const { data: banners, isLoading } = useQuery({
    queryKey: queryKeys.banners.all,
    queryFn: bannerApi.list,
  });

  const [editing, setEditing] = useState<Banner | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [desktopImage, setDesktopImage] = useState<string[]>([]);
  const [mobileImage, setMobileImage] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const confirmDelete = useConfirm<Banner>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BannerValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { title: '', subtitle: '', link: '', sortOrder: 0, isActive: true },
  });

  useEffect(() => {
    if (!isFormOpen) return;

    if (editing) {
      reset({
        title: editing.title,
        subtitle: editing.subtitle ?? '',
        link: editing.link ?? '',
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
        startsAt: toDateTimeLocal(editing.startsAt),
        endsAt: toDateTimeLocal(editing.endsAt),
      });
      setDesktopImage([editing.imageUrl]);
      setMobileImage(editing.mobileImageUrl ? [editing.mobileImageUrl] : []);
    } else {
      reset({ title: '', subtitle: '', link: '', sortOrder: 0, isActive: true, startsAt: '', endsAt: '' });
      setDesktopImage([]);
      setMobileImage([]);
    }
    setFormError(null);
  }, [isFormOpen, editing, reset]);

  const save = useMutation({
    mutationFn: (payload: BannerPayload) =>
      editing ? bannerApi.update(editing.id, payload) : bannerApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
      setFormOpen(false);
      setEditing(null);
      pushToast(editing ? 'Banner updated' : 'Banner created');
    },
    onError: (error: Error) =>
      setFormError(error instanceof ApiError ? error.message : 'Could not save the banner'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => bannerApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
      confirmDelete.dismiss();
      pushToast('Banner deleted');
    },
    onError: (error: Error) => pushToast(error.message, 'error'),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    if (desktopImage.length === 0) {
      setFormError('A desktop image is required');
      return;
    }

    save.mutate({
      title: values.title,
      imageUrl: desktopImage[0]!,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      ...(values.subtitle ? { subtitle: values.subtitle } : {}),
      ...(values.link ? { link: values.link } : {}),
      ...(mobileImage[0] ? { mobileImageUrl: mobileImage[0] } : {}),
      // `datetime-local` gives a local string; the API stores UTC.
      ...(values.startsAt ? { startsAt: new Date(values.startsAt).toISOString() } : {}),
      ...(values.endsAt ? { endsAt: new Date(values.endsAt).toISOString() } : {}),
    });
  });

  return (
    <>
      <PageHeader
        title="Banners"
        description="The hero carousel on the storefront home page."
        actions={
          <Button
            leftIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New banner
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : !banners || banners.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No banners yet"
            description="The storefront hides the hero carousel entirely when there are none."
            action={
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New banner
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner) => {
            const state = liveState(banner);
            return (
              <li key={banner.id} className="card overflow-hidden">
                <div className="relative aspect-[16/7] bg-sunken">
                  <img
                    src={banner.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <Badge tone="neutral">#{banner.sortOrder}</Badge>
                  </div>
                </div>

                <div className="p-3.5">
                  <p className="truncate font-medium">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="truncate text-[13px] text-muted">{banner.subtitle}</p>
                  )}

                  <p className="mt-1.5 truncate font-mono text-[12px] text-muted">
                    {banner.link ?? 'No link'}
                  </p>

                  {(banner.startsAt ?? banner.endsAt) && (
                    <p className="mt-1 text-[12px] text-muted">
                      {banner.startsAt ? formatDate(banner.startsAt) : 'Always'} →{' '}
                      {banner.endsAt ? formatDate(banner.endsAt) : 'Always'}
                    </p>
                  )}

                  <div className="mt-3 flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<IconEdit size={14} />}
                      onClick={() => {
                        setEditing(banner);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                      leftIcon={<IconTrash size={14} />}
                      onClick={() => confirmDelete.request(banner)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit banner' : 'New banner'}
        size="lg"
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

          <Input {...register('title')} label="Title" required error={errors.title?.message} autoFocus />

          <Textarea
            {...register('subtitle')}
            label="Subtitle"
            rows={2}
            error={errors.subtitle?.message}
          />

          <Input
            {...register('link')}
            label="Link"
            placeholder="/women"
            hint="A storefront path such as /women or /?category=women-dresses."
            error={errors.link?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              urls={desktopImage}
              onChange={setDesktopImage}
              single
              label="Desktop image"
              hint="Wide crop, around 1920×720."
            />
            <ImageUploader
              urls={mobileImage}
              onChange={setMobileImage}
              single
              label="Mobile image"
              hint="Optional portrait crop, around 780×900."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              {...register('startsAt')}
              label="Starts"
              type="datetime-local"
              hint="Blank = immediately"
            />
            <Input
              {...register('endsAt')}
              label="Ends"
              type="datetime-local"
              hint="Blank = never"
              error={errors.endsAt?.message}
            />
            <Input
              {...register('sortOrder')}
              label="Sort order"
              type="number"
              min={0}
              error={errors.sortOrder?.message}
            />
          </div>

          <Checkbox
            {...register('isActive')}
            label="Active"
            hint="Inactive banners never show, regardless of schedule."
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete.isOpen}
        onClose={confirmDelete.dismiss}
        onConfirm={() => confirmDelete.pending && remove.mutate(confirmDelete.pending.id)}
        title="Delete banner"
        message={`"${confirmDelete.pending?.title}" will be removed permanently.`}
        confirmLabel="Delete"
        destructive
        isLoading={remove.isPending}
      />
    </>
  );
}
