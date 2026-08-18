import type { MouseEvent, ReactNode } from 'react';
import { formatClock, useCountdown } from '../lib/deals';
import { cn } from '../lib/cn';
import { IconBolt, IconClock, IconFlame, IconPlus } from './icons';

/**
 * Animated gradient discount pill.
 *
 * Deliberately not a flat `-20%` tag: the drifting gradient and the icon give
 * it motion in peripheral vision, which is what makes a grid of cards resolve
 * into "these three are on offer" before any text is read. The treatment
 * escalates with the depth of the discount so a 15% and a 60% saving do not
 * shout with the same voice.
 */
export function HotDealBadge({ percent, className }: { percent: number; className?: string }) {
  const deep = percent >= 40;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip px-2.5 py-1.5',
        'text-[11px] leading-none font-extrabold tracking-wide text-white uppercase',
        deep ? 'badge-hot' : 'badge-brand',
        className,
      )}
    >
      {deep ? (
        <IconFlame size={12} filled className="shrink-0" />
      ) : (
        <IconBolt size={12} className="shrink-0" />
      )}
      {percent}% off
    </span>
  );
}

/** Live "ends in HH:MM:SS" chip. Renders nothing once the offer has lapsed. */
export function CountdownChip({
  targetMs,
  className,
  tone = 'dark',
}: {
  targetMs: number;
  className?: string;
  tone?: 'dark' | 'amber';
}) {
  const parts = useCountdown(targetMs);
  if (parts.expired) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 backdrop-blur-md',
        'text-[10px] font-bold tabular-nums',
        tone === 'amber'
          ? 'bg-amber-soft text-amber-600'
          : 'bg-slate-900/80 text-white ring-1 ring-white/15 ring-inset',
        className,
      )}
    >
      <IconClock size={11} className="shrink-0" />
      {formatClock(parts)}
    </span>
  );
}

/**
 * Stock scarcity meter.
 *
 * The bar is the honest part of the message — a number alone ("only 3 left")
 * is abstract, whereas a nearly-empty track communicates urgency pre-verbally.
 * `total` defaults to 10 so the fill is proportional rather than arbitrary.
 */
export function ScarcityMeter({
  count,
  total = 10,
  className,
}: {
  count: number;
  total?: number;
  className?: string;
}) {
  const percent = Math.max(6, Math.min(100, (count / total) * 100));
  const critical = count <= 3;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            critical
              ? 'bg-gradient-to-r from-orange-400 to-rose-500'
              : 'bg-gradient-to-r from-emerald-400 to-emerald-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-semibold',
          critical ? 'text-hot' : 'text-muted',
        )}
      >
        {critical && (
          <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-hot" aria-hidden="true" />
        )}
        Only {count} left at this price
      </p>
    </div>
  );
}

/** Trust marker — emerald is reserved for reassurance, never for urgency. */
export function TrustChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip bg-success-soft px-2 py-1',
        'text-[11px] font-semibold text-success-deep',
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Price block with a deliberate hierarchy inversion: the struck original sits
 * *above* the live price in a light, low-contrast weight, so the eye lands on
 * the discounted number first and reads the saving as context afterwards.
 */
export function PowerPrice({
  price,
  oldPrice,
  size = 'md',
  className,
}: {
  price: string;
  oldPrice?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const scale = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl sm:text-4xl',
  }[size];

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {oldPrice && (
        <span className="text-[11px] font-medium text-muted/80 line-through decoration-muted/50">
          {oldPrice}
        </span>
      )}
      <span
        className={cn(
          'font-display leading-none font-extrabold tracking-tight text-ink tabular-nums',
          scale,
        )}
      >
        {price}
      </span>
    </div>
  );
}

/**
 * Floating quick-add trigger.
 *
 * Sits bottom-right of a card as a gradient FAB — thumb-reachable, and close
 * enough to the price that the decision and the action share one focal point.
 */
export function QuickAddButton({
  onClick,
  label = 'Add to bag',
  expanded = false,
  className,
}: {
  onClick: (event: MouseEvent) => void;
  label?: string;
  expanded?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'group/qa inline-flex items-center justify-center gap-1.5 rounded-chip',
        'bg-brand text-white shadow-e1',
        'transition-all duration-200 ease-out hover:shadow-brand-lg active:scale-90',
        expanded ? 'h-11 px-5 text-xs font-bold tracking-wide uppercase' : 'size-10',
        className,
      )}
    >
      <IconPlus
        size={expanded ? 14 : 18}
        className="shrink-0 transition-transform duration-200 group-hover/qa:rotate-90"
      />
      {expanded && label}
    </button>
  );
}
