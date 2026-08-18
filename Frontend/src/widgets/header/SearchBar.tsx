import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchSuggestions } from '../../entities/product/queries';
import { useClickOutside, useDebouncedValue } from '../../shared/lib/hooks';
import { formatPrice } from '../../shared/lib/format';
import { highlightMatch } from '../../shared/lib/sanitize';
import { cn } from '../../shared/lib/cn';
import { IconClose, IconSearch, Image, Spinner } from '../../shared/ui';

/**
 * Header search with live autocomplete.
 *
 * The input is debounced by 250ms and the query needs two characters before it
 * fires — without both, a five-letter word would cost five requests and the
 * backend's search rate limit would start rejecting them mid-word.
 */
export function SearchBar({
  onNavigate,
  /** Rendered inside the field's right edge — the QR / voice capture triggers. */
  trailing,
  placeholder = 'Search for dresses, shirts, coats…',
}: {
  onNavigate?: () => void;
  trailing?: React.ReactNode;
  placeholder?: string;
}) {
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const debouncedTerm = useDebouncedValue(term, 250);
  const { data, isFetching } = useSearchSuggestions(debouncedTerm);

  const containerRef = useClickOutside<HTMLDivElement>(() => setFocused(false), focused);

  const isOpen = focused && debouncedTerm.trim().length >= 2;
  const hasResults = Boolean(data && (data.products.length > 0 || data.categories.length > 0));

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/?q=${encodeURIComponent(trimmed)}`);
    setFocused(false);
    onNavigate?.();
  }

  function close(): void {
    setFocused(false);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={submit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>

        <div className="relative">
          <IconSearch
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />

          <input
            id="site-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-suggestions"
            className={cn(
              'h-12 w-full rounded-chip bg-surface pr-24 pl-10 shadow-e1',
              'text-base transition-shadow placeholder:text-muted',
              'focus:shadow-e2 focus:outline-none',
              // Hide the browser's own clear button; we render our own.
              '[&::-webkit-search-cancel-button]:appearance-none',
            )}
          />

          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
            {term && (
              <button
                type="button"
                onClick={() => setTerm('')}
                aria-label="Clear search"
                className="grid size-8 place-items-center rounded-full text-muted transition-transform hover:bg-surface-sunken hover:text-ink active:scale-90"
              >
                <IconClose size={16} />
              </button>
            )}
            {trailing}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="search-suggestions"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-card bg-surface p-2 shadow-e3"
          >
            {isFetching && !hasResults && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted">
                <Spinner size={14} /> Searching…
              </div>
            )}

            {!isFetching && !hasResults && (
              <p className="px-3 py-4 text-sm text-muted">
                Nothing found for “{debouncedTerm}”.
              </p>
            )}

            {data?.categories.map((category) => (
              <Link
                key={category.id}
                to={`/?category=${category.slug}`}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-sunken"
              >
                <IconSearch size={16} className="text-muted" />
                <span>
                  in <span className="font-medium">{category.name}</span>
                </span>
              </Link>
            ))}

            {data && data.categories.length > 0 && data.products.length > 0 && (
              <hr className="my-2 border-line" />
            )}

            {data?.products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-sunken"
              >
                <Image
                  src={product.images[0]?.url ?? null}
                  alt={product.title}
                  ratio="square"
                  className="size-12 shrink-0 rounded-sm"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm"
                    // Sanitized in `highlightMatch`: the title is escaped
                    // before the <mark> wrapper is added, then purified.
                    dangerouslySetInnerHTML={{ __html: highlightMatch(product.title, debouncedTerm) }}
                  />
                  <span className="block text-xs text-muted">
                    {formatPrice(product.price, product.currency)}
                  </span>
                </span>
              </Link>
            ))}

            {hasResults && (
              <button
                type="button"
                onClick={(event) => submit(event)}
                className="mt-1 w-full rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-brand-strong transition-colors hover:bg-brand-soft"
              >
                See all results for “{debouncedTerm}”
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
