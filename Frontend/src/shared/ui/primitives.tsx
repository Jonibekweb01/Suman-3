import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { formatPrice } from '../lib/format';
import { IconAlert, IconCheck, IconStar } from './icons';

// --- Badge -------------------------------------------------------------------

type BadgeTone = 'neutral' | 'accent' | 'danger' | 'success' | 'outline' | 'hot' | 'soft';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink text-white',
  accent: 'bg-brand text-white shadow-e1',
  danger: 'bg-danger text-white',
  success: 'bg-success-soft text-success-deep',
  hot: 'badge-hot text-white',
  soft: 'bg-brand-soft text-brand-strong',
  outline: 'bg-surface text-ink-soft shadow-e1',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Skeleton ----------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-2xl', className)} aria-hidden="true" />;
}

// --- Empty state -------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      {icon && <div className="mb-1 text-line-strong">{icon}</div>}
      <h3 className="text-xl font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// --- Rating ------------------------------------------------------------------

export function Rating({
  value,
  count,
  size = 14,
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="flex text-amber">
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStar key={star} size={size} filled={star <= Math.round(value)} strokeWidth={1.2} />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-ink-soft">{value.toFixed(1)}</span>}
      {count !== undefined && count > 0 && <span className="text-xs text-muted">({count})</span>}
    </div>
  );
}

// --- Price -------------------------------------------------------------------

export function PriceTag({
  price,
  oldPrice,
  currency,
  size = 'md',
}: {
  price: number;
  oldPrice?: number | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: { now: 'text-base', was: 'text-xs' },
    md: { now: 'text-lg', was: 'text-sm' },
    lg: { now: 'text-3xl', was: 'text-base' },
  }[size];

  const discounted = oldPrice != null && oldPrice > price;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={cn(
          'font-display font-extrabold tracking-tight tabular-nums',
          sizes.now,
          discounted ? 'text-hot' : 'text-ink',
        )}
      >
        {formatPrice(price, currency)}
      </span>
      {discounted && (
        <span className={cn(sizes.was, 'text-muted line-through')}>
          {formatPrice(oldPrice, currency)}
        </span>
      )}
    </div>
  );
}

// --- Toast -------------------------------------------------------------------

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
 * Toasts live in a store rather than context so non-React code — the axios
 * interceptor, a mutation callback — can raise one without a hook.
 */
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 3800);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToast((state) => state.dismiss);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 26, stiffness: 340 }}
      role="status"
      onClick={() => dismiss(item.id)}
      className={cn(
        'pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-e4',
        item.tone === 'success' ? 'glass-dark text-white' : 'bg-danger text-white',
      )}
    >
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full',
          item.tone === 'success' ? 'bg-success text-white' : 'bg-white/20',
        )}
      >
        {item.tone === 'success' ? <IconCheck size={14} /> : <IconAlert size={14} />}
      </span>
      <span className="max-w-xs">{item.message}</span>
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useToast((state) => state.toasts);

  return (
    // Cleared above the docked bottom nav on mobile so a toast never lands on
    // top of the tab bar; back to the bottom edge once the nav is gone.
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <Toast key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
