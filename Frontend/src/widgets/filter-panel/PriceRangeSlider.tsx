import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../shared/lib/format';

export interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  currency?: string;
}

/**
 * Dual-thumb price slider.
 *
 * Built from two stacked range inputs rather than a drag library: it keeps the
 * control keyboard-accessible and screen-reader-friendly for free, which a
 * div-with-pointer-events implementation has to reinvent badly.
 *
 * The trick is `pointer-events: none` on the track with it re-enabled on the
 * thumbs, so whichever thumb is under the cursor receives the drag.
 */
export function PriceRangeSlider({ min, max, value, onChange, currency }: PriceRangeSliderProps) {
  const [local, setLocal] = useState<[number, number]>(value);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow external resets (facet reload, "clear all") without fighting the
  // user mid-drag.
  useEffect(() => setLocal(value), [value]);

  const step = Math.max(Math.round((max - min) / 100), 1);

  /**
   * Dragging fires dozens of change events; committing each one would refetch
   * the grid on every pixel. The local value drives the UI immediately and the
   * parent is told once the thumb settles.
   */
  const commit = useCallback(
    (next: [number, number]) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => onChange(next), 350);
    },
    [onChange],
  );

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  function handleMin(raw: number): void {
    // Never let the thumbs cross.
    const nextMin = Math.min(raw, local[1] - step);
    const next: [number, number] = [Math.max(nextMin, min), local[1]];
    setLocal(next);
    commit(next);
  }

  function handleMax(raw: number): void {
    const nextMax = Math.max(raw, local[0] + step);
    const next: [number, number] = [local[0], Math.min(nextMax, max)];
    setLocal(next);
    commit(next);
  }

  const range = max - min || 1;
  const leftPercent = ((local[0] - min) / range) * 100;
  const rightPercent = ((local[1] - min) / range) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-card bg-surface-sunken px-2.5 py-1 tabular-nums">
          {formatPrice(local[0], currency)}
        </span>
        <span className="text-muted">—</span>
        <span className="rounded-card bg-surface-sunken px-2.5 py-1 tabular-nums">
          {formatPrice(local[1], currency)}
        </span>
      </div>

      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={local[0]}
          onChange={(event) => handleMin(Number(event.target.value))}
          aria-label="Minimum price"
          className="range-thumb absolute inset-x-0 top-0 h-11 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={local[1]}
          onChange={(event) => handleMax(Number(event.target.value))}
          aria-label="Maximum price"
          className="range-thumb absolute inset-x-0 top-0 h-11 w-full appearance-none bg-transparent"
        />
      </div>

      <style>{`
        .range-thumb {
          pointer-events: none;
        }
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: var(--color-surface);
          border: 2px solid var(--color-ink);
          cursor: grab;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
          transition: transform 0.15s ease;
        }
        .range-thumb::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.12);
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: var(--color-surface);
          border: 2px solid var(--color-ink);
          cursor: grab;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
        }
        .range-thumb:focus-visible::-webkit-slider-thumb {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
