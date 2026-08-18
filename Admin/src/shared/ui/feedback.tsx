import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { cn, type Tone } from '../lib/utils';
import { useEscapeKey, useScrollLock } from '../lib/hooks';
import { IconAlert, IconCheck, IconClose } from './icons';
import { Button } from './controls';

// --- Badge -------------------------------------------------------------------

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Skeleton ----------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} aria-hidden="true" />;
}

// --- Empty state -------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// --- Inline error ------------------------------------------------------------

export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger',
        className,
      )}
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {message}
    </p>
  );
}

// --- Modal -------------------------------------------------------------------

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);
  useEscapeKey(onClose, open);

  // Focus into the dialog and trap Tab. Without this, keyboard focus stays on
  // the table behind the overlay.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/45"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative my-auto w-full rounded-lg bg-surface shadow-2xl outline-none',
              MODAL_SIZES[size],
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
              >
                <IconClose size={16} />
              </button>
            </header>

            <div className="px-5 py-5">{children}</div>

            {footer && (
              <footer className="flex justify-end gap-2 border-t border-line bg-canvas px-5 py-3.5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// --- Confirm dialog ----------------------------------------------------------

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isLoading = false,
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
    </Modal>
  );
}

// --- Toasts ------------------------------------------------------------------

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem['tone']) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

/**
 * A store, not context — mutation callbacks and the axios interceptor need to
 * raise a toast from outside the React tree.
 */
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    // Errors stay longer: they usually carry something the admin must read.
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      tone === 'error' ? 6000 : 3500,
    );
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function ToastViewport() {
  const toasts = useToast((state) => state.toasts);
  const dismiss = useToast((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            role="status"
            onClick={() => dismiss(toast.id)}
            className={cn(
              'pointer-events-auto flex cursor-pointer items-start gap-2.5 rounded-md px-4 py-3 text-sm shadow-lg',
              toast.tone === 'success' ? 'bg-ink text-white' : 'bg-danger text-white',
            )}
          >
            {toast.tone === 'success' ? (
              <IconCheck size={16} className="mt-px shrink-0" />
            ) : (
              <IconAlert size={16} className="mt-px shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
