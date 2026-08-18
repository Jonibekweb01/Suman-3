import { useState } from 'react';
import { cn } from '../lib/cn';

export interface ImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Aspect ratio reserves space before load — this is the CLS budget. */
  ratio?: 'portrait' | 'square' | 'wide' | 'none';
  /** The hero and the first row of cards should NOT be lazy. */
  priority?: boolean;
  sizes?: string;
}

const RATIOS = {
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/9]',
  none: '',
} as const;

/**
 * Image with a reserved box, a fade-in, and a graceful empty state.
 *
 * `loading="lazy"` + `decoding="async"` keep off-screen images out of the
 * critical path; the fixed aspect ratio means the layout never jumps when they
 * arrive. Both matter directly for the Lighthouse target.
 */
export function Image({ src, alt, className, ratio = 'portrait', priority = false, sizes }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-surface-sunken', RATIOS[ratio], className)}>
      {!loaded && !failed && <div className="absolute inset-0 shimmer" aria-hidden="true" />}

      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          // `high` tells the browser to pull the LCP image ahead of the queue.
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'size-full object-cover transition-opacity duration-500 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <div className="grid size-full place-items-center text-xs uppercase tracking-widest text-muted">
          Suman
        </div>
      )}
    </div>
  );
}
