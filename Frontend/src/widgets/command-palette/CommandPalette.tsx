import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSearchSuggestions } from '../../entities/product/queries';
import { useCommandPalette } from '../../features/command-palette/useCommandPalette';
import { cn } from '../../shared/lib/cn';
import { formatPrice } from '../../shared/lib/format';
import { useDebouncedValue, useEscapeKey, useScrollLock } from '../../shared/lib/hooks';
import {
  IconBag,
  IconFlame,
  IconHeart,
  IconHome,
  IconSearch,
  IconSparkles,
  Image,
  Spinner,
} from '../../shared/ui';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  to: string;
  /** Extra words the query is matched against but that are not displayed. */
  keywords?: string;
}

const ROUTES: Command[] = [
  { id: 'home', label: 'New in', icon: <IconHome size={17} />, to: '/', keywords: 'home feed latest' },
  { id: 'deals', label: 'Hot deals', hint: 'Discounted now', icon: <IconFlame size={17} />, to: '/?featured=true', keywords: 'sale discount offers' },
  { id: 'women', label: 'Women', icon: <IconSparkles size={17} />, to: '/women', keywords: 'womenswear ladies' },
  { id: 'men', label: 'Men', icon: <IconSparkles size={17} />, to: '/men', keywords: 'menswear' },
  { id: 'wishlist', label: 'Wishlist', icon: <IconHeart size={17} />, to: '/wishlist', keywords: 'saved favourites' },
  { id: 'cart', label: 'Your bag', icon: <IconBag size={17} />, to: '/cart', keywords: 'cart checkout basket' },
  { id: 'orders', label: 'Orders', icon: <IconBag size={17} />, to: '/orders', keywords: 'history tracking' },
];

/**
 * ⌘K command palette — the desktop counterpart to the mobile search sheet.
 *
 * Unlike the header autocomplete, this addresses the whole app: routes and
 * products share one ranked list, so "deals" jumps to the offers feed while
 * "linen shirt" resolves to a product. Arrow keys and Enter drive it end to
 * end; the mouse is optional.
 */
export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);

  const debouncedTerm = useDebouncedValue(term, 200);
  const { data, isFetching } = useSearchSuggestions(debouncedTerm);

  useScrollLock(isOpen);
  useEscapeKey(close, isOpen);

  useEffect(() => {
    if (isOpen) {
      setTerm('');
      setCursor(0);
      // The palette is a modal: focus must land in the field, not behind it.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const routeMatches = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return ROUTES.slice(0, 4);
    return ROUTES.filter((command) =>
      `${command.label} ${command.keywords ?? ''}`.toLowerCase().includes(query),
    );
  }, [term]);

  // Memoized so the flat list below is not rebuilt on every keystroke render:
  // `?? []` would hand it a fresh array identity each time.
  const productMatches = useMemo(() => data?.products ?? [], [data]);

  // One flat list so the keyboard cursor can cross the section boundary
  // without the caller tracking which group it is currently inside.
  const flat = useMemo(
    () => [
      ...routeMatches.map((command) => ({ to: command.to, key: command.id })),
      ...productMatches.map((product) => ({ to: `/product/${product.id}`, key: product.id })),
    ],
    [routeMatches, productMatches],
  );

  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(flat.length - 1, 0)));
  }, [flat.length]);

  function go(to: string): void {
    close();
    navigate(to);
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => (flat.length === 0 ? 0 : (current + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => (flat.length === 0 ? 0 : (current - 1 + flat.length) % flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = flat[cursor];
      if (target) go(target.to);
      else if (term.trim()) go(`/?q=${encodeURIComponent(term.trim())}`);
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-panel bg-surface shadow-e4"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <IconSearch size={18} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search products, jump to a page…"
                aria-label="Command palette search"
                className="h-14 flex-1 bg-transparent text-base placeholder:text-muted focus:outline-none"
              />
              {isFetching && <Spinner size={15} className="text-muted" />}
              <kbd className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-[10px] font-bold text-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
              {routeMatches.length > 0 && (
                <section>
                  <p className="px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                    Go to
                  </p>
                  {routeMatches.map((command, index) => (
                    <button
                      key={command.id}
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(command.to)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                        cursor === index ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface-sunken',
                      )}
                    >
                      <span className="shrink-0">{command.icon}</span>
                      <span className="flex-1 text-sm font-semibold">{command.label}</span>
                      {command.hint && <span className="text-xs text-muted">{command.hint}</span>}
                    </button>
                  ))}
                </section>
              )}

              {productMatches.length > 0 && (
                <section className="mt-1">
                  <p className="px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                    Products
                  </p>
                  {productMatches.map((product, index) => {
                    const flatIndex = routeMatches.length + index;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onMouseEnter={() => setCursor(flatIndex)}
                        onClick={() => go(`/product/${product.id}`)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors',
                          cursor === flatIndex ? 'bg-brand-soft' : 'hover:bg-surface-sunken',
                        )}
                      >
                        <Image
                          src={product.images[0]?.url ?? null}
                          alt={product.title}
                          ratio="square"
                          className="size-11 shrink-0 rounded-xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{product.title}</span>
                          <span className="block text-xs font-medium text-muted tabular-nums">
                            {formatPrice(product.price, product.currency)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </section>
              )}

              {term.trim().length >= 2 && !isFetching && flat.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Nothing found for “{term.trim()}”.
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] font-medium text-muted">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span className="ml-auto">esc close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
