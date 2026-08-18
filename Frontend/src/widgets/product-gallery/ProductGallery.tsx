import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { cn } from '../../shared/lib/cn';
import { useMediaQuery } from '../../shared/lib/hooks';
import { IconChevronLeft, IconChevronRight, Image } from '../../shared/ui';
import type { ProductImage } from '../../shared/types/product';

export interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

/**
 * Product image gallery.
 *
 * Two distinct interactions by breakpoint, because the right gesture differs:
 * mobile gets a native scroll-snap strip (momentum and rubber-banding come for
 * free and feel better than any JS carousel), desktop gets a thumbnail rail
 * plus cursor-tracked zoom.
 */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const stripRef = useRef<HTMLDivElement>(null);

  const active = images[activeIndex] ?? images[0];

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>): void {
    if (!zoomed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  }

  /** Keeps the dots in sync as the shopper swipes the mobile strip. */
  function handleStripScroll(): void {
    const strip = stripRef.current;
    if (!strip) return;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    setActiveIndex(Math.min(Math.max(index, 0), images.length - 1));
  }

  function step(direction: 1 | -1): void {
    const next = (activeIndex + direction + images.length) % images.length;
    setActiveIndex(next);
    stripRef.current?.scrollTo({ left: next * stripRef.current.clientWidth, behavior: 'smooth' });
  }

  if (images.length === 0) {
    return <Image src={null} alt={title} ratio="portrait" />;
  }

  // --- Mobile: swipeable strip ---------------------------------------------
  if (!isDesktop) {
    return (
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={stripRef}
          onScroll={handleStripScroll}
          className="scroll-strip"
          aria-label={`${title} images`}
        >
          {images.map((image, index) => (
            <div key={image.id ?? image.url} className="w-full shrink-0 snap-center">
              <Image
                src={image.url}
                alt={image.alt ?? `${title} — view ${index + 1}`}
                ratio="portrait"
                priority={index === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-ink/45 px-2.5 py-1.5 backdrop-blur-sm">
            {images.map((image, index) => (
              <span
                key={image.id ?? image.url}
                className={cn(
                  'size-1.5 rounded-full transition-all duration-300',
                  index === activeIndex ? 'w-4 bg-canvas' : 'bg-canvas/50',
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Desktop: rail + zoom -------------------------------------------------
  return (
    <div className="flex gap-4 rounded-card border border-line bg-surface-sunken p-3 shadow-none">
      <div className="flex w-20 shrink-0 flex-col gap-3">
        {images.map((image, index) => (
          <button
            key={image.id ?? image.url}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`View image ${index + 1}`}
            aria-current={index === activeIndex}
            className={cn(
              'overflow-hidden rounded-card border transition-all duration-200',
              index === activeIndex
                ? 'border-ink shadow-sm opacity-100'
                : 'border-transparent opacity-60 hover:opacity-100',
            )}
          >
            <Image src={image.url} alt="" ratio="portrait" sizes="80px" />
          </button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        <div
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onMouseMove={handlePointerMove}
          className="relative overflow-hidden rounded-card bg-surface"
          style={{ cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active?.url}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="transition-transform duration-300 ease-out"
                style={{
                  transform: zoomed ? 'scale(2)' : 'scale(1)',
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              >
                <Image
                  src={active?.url ?? null}
                  alt={active?.alt ?? title}
                  ratio="portrait"
                  priority
                  sizes="(max-width: 1279px) 50vw, 640px"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <IconChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
