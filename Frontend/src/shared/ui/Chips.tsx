import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Category pill for edge-to-edge snap strips.
 *
 * Active state is a filled gradient with a coloured glow rather than a border
 * swap, so the selected pill is legible at a glance while scrolling past.
 */
export function CategoryPill({
  active = false,
  onClick,
  icon,
  count,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-chip px-4 text-sm font-semibold whitespace-nowrap',
        'transition-all duration-200 ease-out active:scale-95',
        active
          ? 'bg-brand text-white shadow-e1'
          : 'bg-surface text-ink-soft shadow-e1 hover:-translate-y-0.5 hover:text-ink hover:shadow-e2',
        className,
      )}
    >
      {icon && <span className={cn('shrink-0', active ? 'text-white' : 'text-muted')}>{icon}</span>}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-white/20 text-white' : 'bg-surface-sunken text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface SegmentedTabsProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Segmented control with a sliding active pill.
 *
 * The indicator is a shared `layoutId`, so switching tabs animates the pill
 * between positions instead of cross-fading two states. That continuity is
 * what separates an app-grade tab bar from a row of styled buttons.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedTabsProps<T>) {
  const layoutId = useId();

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-chip bg-surface-sunken p-1',
        size === 'sm' ? 'h-10' : 'h-12',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex h-full items-center gap-1.5 rounded-chip px-4 font-semibold whitespace-nowrap',
              'transition-colors duration-200 active:scale-95',
              size === 'sm' ? 'text-xs' : 'text-sm',
              active ? 'text-ink' : 'text-muted hover:text-ink-soft',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-chip bg-surface shadow-e1"
                transition={{ type: 'spring', damping: 30, stiffness: 420 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
