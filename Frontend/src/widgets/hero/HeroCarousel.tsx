import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBanners } from '../../entities/catalog/api';
import { cn } from '../../shared/lib/cn';
import { IconBolt, IconChevronLeft, IconChevronRight, Skeleton } from '../../shared/ui';

const AUTOPLAY_MS = 6000;

export function HeroCarousel() {
  const { data: banners, isLoading } = useBanners();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners?.length ?? 0;

  const goTo = useCallback((next: number) => setIndex(next), []);
  const next = useCallback(() => setIndex((current) => (current + 1) % Math.max(count, 1)), [count]);
  const previous = useCallback(
    () => setIndex((current) => (current - 1 + Math.max(count, 1)) % Math.max(count, 1)),
    [count],
  );

  // Autoplay pauses on hover/focus and whenever the tab is hidden — a carousel
  // silently advancing in a background tab is wasted work and a jarring return.
  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, next]);

  useEffect(() => {
    const onVisibilityChange = (): void => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  if (isLoading) {
    return (
      <Skeleton className="h-[58vh] max-h-[560px] min-h-[360px] w-full rounded-none lg:rounded-[2rem]" />
    );
  }

  if (!banners || banners.length === 0) return null;

  const banner = banners[index]!;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      /* Rounded from `lg`, where it sits inside the dashboard's centre column
         as a card rather than running to the browser edge. */
      className="relative h-[58vh] max-h-[560px] min-h-[360px] w-full overflow-hidden bg-surface-sunken lg:rounded-[2rem]"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.7 }, scale: { duration: 7, ease: 'linear' } }}
          className="absolute inset-0"
        >
          <picture>
            {banner.mobileImageUrl && (
              <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />
            )}
            <img
              src={banner.imageUrl}
              alt=""
              // The hero is the LCP element on the home page: never lazy, and
              // flagged high so the browser fetches it before anything else.
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="container-page relative flex h-full items-end pb-14 sm:pb-20">
        <motion.div
          key={`${banner.id}-copy`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-canvas"
        >
          <span className="badge-hot mb-4 inline-flex items-center gap-1.5 rounded-chip px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-white uppercase">
            <IconBolt size={12} />
            Up to 50% off — today only
          </span>
          <h1 className="font-display text-4xl leading-[1] font-extrabold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="mt-4 max-w-md text-base text-white/85 sm:text-lg">{banner.subtitle}</p>
          )}
          {banner.link && (
            <Link
              to={banner.link}
              className="shimmer-sweep group mt-7 inline-flex h-13 items-center gap-2 rounded-field bg-brand px-8 text-sm font-bold tracking-wide text-white uppercase shadow-e1 transition-transform duration-200 hover:bg-brand-strong hover:scale-[1.02] active:scale-95"
            >
              Shop the edit
              <IconChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </motion.div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={previous}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-canvas/20 text-canvas backdrop-blur-sm transition-colors hover:bg-canvas/35 sm:grid"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-canvas/20 text-canvas backdrop-blur-sm transition-colors hover:bg-canvas/35 sm:grid"
          >
            <IconChevronRight />
          </button>

          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {banners.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(dotIndex)}
                aria-label={`Go to slide ${dotIndex + 1}`}
                aria-current={dotIndex === index}
                className="group grid h-8 place-items-center px-1"
              >
                <span
                  className={cn(
                    'h-[3px] rounded-full transition-all duration-300',
                    dotIndex === index ? 'w-8 bg-canvas' : 'w-4 bg-canvas/45 group-hover:bg-canvas/70',
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
