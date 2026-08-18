import { useCallback, useEffect, useRef, useState } from 'react';

/** Delays a fast-changing value — search input, price slider. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Fires `onIntersect` when the sentinel scrolls into view.
 *
 * This is what drives infinite scroll. `rootMargin` starts the next fetch
 * before the sentinel is actually visible, so the grid never shows a gap.
 */
export function useIntersectionObserver(
  onIntersect: () => void,
  options: { enabled?: boolean; rootMargin?: string } = {},
): (node: Element | null) => void {
  const { enabled = true, rootMargin = '400px' } = options;

  // Keeping the callback in a ref means a new closure on every render does not
  // tear down and rebuild the observer.
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect();
      if (!node || !enabled) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) callbackRef.current();
        },
        { rootMargin },
      );
      observerRef.current.observe(node);
    },
    [enabled, rootMargin],
  );
}

/** Tracks a media query. Used to branch behaviour, not styling. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = (): void => setMatches(list.matches);

    sync();
    list.addEventListener('change', sync);
    // Belt and braces: some embedded webviews and emulated viewports resize
    // without dispatching a MediaQueryList change event, which would leave the
    // layout stuck on the previous breakpoint until the next reload.
    window.addEventListener('resize', sync);

    return () => {
      list.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, [query]);

  return matches;
}

/**
 * Freezes background scrolling while a modal or drawer is open.
 *
 * Padding compensates for the removed scrollbar so the layout behind the
 * overlay does not shift by ~15px when it opens.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

/** Calls `handler` on Escape. Every dismissible overlay uses it. */
export function useEscapeKey(handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') handlerRef.current();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}

/** Calls `handler` on a pointer press outside the referenced element. */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  enabled = true,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: PointerEvent): void => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) handlerRef.current();
    };
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [enabled]);

  return ref;
}

/** Typed localStorage that survives a quota error or private-mode block. */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota — the feature degrades, nothing breaks.
  }
}
