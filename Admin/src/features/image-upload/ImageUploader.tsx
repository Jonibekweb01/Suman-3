import { useRef, useState } from 'react';
import { apiUpload } from '../../shared/api/client';
import { ApiError } from '../../shared/api/types';
import { cn } from '../../shared/lib/utils';
import type { UploadedImage } from '../../shared/types';
import {
  Button,
  ErrorBanner,
  IconClose,
  IconUpload,
  Spinner,
  useToast,
} from '../../shared/ui';

export interface ImageUploaderProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  /** Single-image fields (banners) hide the reordering affordances. */
  single?: boolean;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_MB = 5;

/**
 * Uploads to `POST /uploads/images` and hands the resulting URLs back to the
 * form.
 *
 * Files are validated client-side before the request so an oversized image
 * fails instantly instead of after a slow upload that the server will reject
 * anyway. The server re-validates type and size regardless.
 *
 * Order matters for products — the first image is the card thumbnail — so the
 * list is reorderable rather than a bare set.
 */
export function ImageUploader({
  urls,
  onChange,
  max = 10,
  label = 'Images',
  hint,
  single = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pushToast = useToast((state) => state.push);

  const limit = single ? 1 : max;
  const remaining = limit - urls.length;

  async function upload(files: FileList | File[]): Promise<void> {
    setError(null);

    const picked = Array.from(files).slice(0, remaining);
    if (picked.length === 0) {
      setError(`You can attach at most ${limit} image${limit === 1 ? '' : 's'}`);
      return;
    }

    const tooBig = picked.find((file) => file.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than ${MAX_MB}MB`);
      return;
    }

    const wrongType = picked.find((file) => !ACCEPTED.split(',').includes(file.type));
    if (wrongType) {
      setError(`"${wrongType.name}" is not a supported image format`);
      return;
    }

    const formData = new FormData();
    for (const file of picked) formData.append('files', file);

    setIsUploading(true);
    try {
      const uploaded = await apiUpload<UploadedImage[]>('/uploads/images', formData);
      onChange(single ? [uploaded[0]!.url] : [...urls, ...uploaded.map((item) => item.url)]);
      pushToast(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset so re-picking the same file still fires a change event.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-soft">{label}</p>

      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {urls.map((url, index) => (
            <li key={url} className="group relative overflow-hidden rounded-md border border-line">
              <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />

              {index === 0 && !single && (
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Main
                </span>
              )}

              <button
                type="button"
                onClick={() => onChange(urls.filter((item) => item !== url))}
                aria-label="Remove image"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <IconClose size={13} />
              </button>

              {!single && urls.length > 1 && (
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move earlier"
                    className="grid size-6 place-items-center rounded bg-ink/70 text-xs text-white disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === urls.length - 1}
                    aria-label="Move later"
                    className="grid size-6 place-items-center rounded bg-ink/70 text-xs text-white disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void upload(event.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
            isDragging ? 'border-brand bg-info-soft' : 'border-line-strong bg-canvas',
          )}
        >
          {isUploading ? (
            <>
              <Spinner size={20} className="text-muted" />
              <p className="text-[13px] text-muted">Uploading…</p>
            </>
          ) : (
            <>
              <IconUpload size={20} className="text-muted" />
              <p className="text-[13px] text-muted">
                Drag images here, or{' '}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="font-medium text-brand underline underline-offset-2"
                >
                  browse
                </button>
              </p>
              <p className="text-[12px] text-muted">
                JPEG, PNG, WebP or AVIF · up to {MAX_MB}MB · {remaining} slot
                {remaining === 1 ? '' : 's'} left
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple={!single}
            onChange={(event) => event.target.files && void upload(event.target.files)}
            className="hidden"
          />
        </div>
      )}

      {hint && !error && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      {error && <ErrorBanner message={error} className="mt-2" />}

      {/* Escape hatch: paste a CDN URL directly rather than re-uploading an
          asset that already lives somewhere. */}
      {remaining > 0 && (
        <PasteUrlRow
          onAdd={(url) => onChange(single ? [url] : [...urls, url])}
          disabled={isUploading}
        />
      )}
    </div>
  );
}

function PasteUrlRow({ onAdd, disabled }: { onAdd: (url: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');

  function submit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    onAdd(trimmed);
    setValue('');
  }

  return (
    <div className="mt-2 flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="…or paste an image URL"
        aria-label="Image URL"
        className="h-9 flex-1 rounded-md border border-line-strong bg-surface px-3 text-[13px] focus:border-brand focus:outline-none"
      />
      <Button variant="secondary" size="sm" onClick={submit} disabled={disabled || !value.trim()}>
        Add
      </Button>
    </div>
  );
}
