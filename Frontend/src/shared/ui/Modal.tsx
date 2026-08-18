import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { useEscapeKey, useMediaQuery, useScrollLock } from '../lib/hooks';
import { IconClose } from './icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** `sheet` slides up from the bottom on mobile — the native-feeling default. */
  variant?: 'sheet' | 'center';
  size?: 'sm' | 'md' | 'lg';
  hideCloseButton?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = 'sheet',
  size = 'md',
  hideCloseButton = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 639px)');
  const asSheet = variant === 'sheet' && isMobile;

  useScrollLock(open);
  useEscapeKey(onClose, open);

  // Move focus into the dialog on open, and trap Tab inside it. Without this,
  // keyboard users tab straight into the page behind the overlay.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusables[0] ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={asSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={cn(
              'relative w-full bg-surface shadow-2xl outline-none',
              asSheet
                ? 'max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]'
                : cn('max-h-[88dvh] overflow-y-auto rounded-card', SIZES[size]),
            )}
          >
            {asSheet && (
              <div className="sticky top-0 flex justify-center bg-surface pt-3 pb-1">
                <span className="h-1 w-10 rounded-full bg-line-strong" />
              </div>
            )}

            {(title || !hideCloseButton) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
                {title && <h2 className="text-xl font-medium">{title}</h2>}
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <IconClose />
                  </button>
                )}
              </div>
            )}

            <div className="px-5 pb-6 pt-4 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
