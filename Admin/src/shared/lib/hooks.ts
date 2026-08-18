import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

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

/**
 * Guards a destructive action behind a confirmation dialog.
 *
 * Holds the pending payload so the caller can name what is about to happen —
 * "Archive Silk Midi Dress?" rather than a generic "Are you sure?", which
 * people click through without reading.
 */
export function useConfirm<T>() {
  const [pending, setPending] = useState<T | null>(null);

  return {
    pending,
    isOpen: pending !== null,
    request: (payload: T) => setPending(payload),
    dismiss: () => setPending(null),
  };
}
