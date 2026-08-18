import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { useEscapeKey, useMediaQuery, useScrollLock } from '../lib/hooks';
import { IconClose } from './icons';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Pinned to the bottom of the sheet, outside the scroll area — the CTA. */
  footer?: ReactNode;
  /** Fraction of the viewport the sheet is allowed to grow to. */
  maxHeight?: 'half' | 'tall' | 'full';
  hideHandle?: boolean;
  className?: string;
}

const MAX_HEIGHTS = {
  half: 'max-h-[60dvh]',
  tall: 'max-h-[88dvh]',
  full: 'h-[94dvh]',
} as const;

/** Past either of these the gesture reads as intentional dismissal. */
const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY = 600;

/**
 * Native-style bottom sheet.
 *
 * The whole point of the mobile paradigm is that nothing navigates away: a
 * filter, a size picker or a cart preview opens *over* the current context
 * and returns you to exactly where you were. That only feels native if the
 * sheet is physically draggable, so it is — with the same distance-or-
 * velocity dismissal rule iOS and Android use, meaning a quick flick closes
 * it even though the finger barely travelled.
 *
 * Above `sm` it becomes a centred dialog: a sheet glued to the bottom edge of
 * a 1440px monitor is a mobile pattern misapplied.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxHeight = 'tall',
  hideHandle = false,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 639px)');

  const y = useMotionValue(0);
  // Dimming the backdrop as the sheet is dragged down is the cue that makes
  // the gesture feel connected to the page rather than to a floating layer.
  const backdropOpacity = useTransform(y, [0, 400], [1, 0.2]);

  useScrollLock(open);
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  // Focus management: move into the sheet on open, trap Tab, restore on close.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    (panel.querySelector<HTMLElement>(selector) ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = panel.querySelectorAll<HTMLElement>(selector);
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  function handleDragEnd(_event: unknown, info: PanInfo): void {
    if (info.offset.y > DISMISS_DISTANCE_PX || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ opacity: isMobile ? backdropOpacity : undefined }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            style={isMobile ? { y } : undefined}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.8 }}
            drag={isMobile ? 'y' : false}
            // Rubber-band upward, free downward: you can never drag a sheet
            // off the top of the screen, but you can always flick it away.
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.7 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative flex w-full flex-col overflow-hidden bg-surface outline-none',
              'rounded-t-panel shadow-e4 sm:max-w-lg sm:rounded-panel',
              MAX_HEIGHTS[maxHeight],
              className,
            )}
          >
            {!hideHandle && (
              <div className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing sm:hidden">
                <span className="h-1.5 w-11 rounded-full bg-line-strong" />
              </div>
            )}

            {(title || description) && (
              <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3 sm:pt-6">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
                  )}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-muted transition-all duration-200 hover:bg-line hover:text-ink active:scale-90"
                >
                  <IconClose size={18} />
                </button>
              </div>
            )}

            {/* `overscroll-contain` stops a flick at the end of this list from
                scrolling the page behind the sheet. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-line bg-surface/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:pb-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
