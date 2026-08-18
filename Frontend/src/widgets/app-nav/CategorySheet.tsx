import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../entities/catalog/api';
import { BottomSheet, IconArrowRight, IconSparkles, Image, Skeleton } from '../../shared/ui';
import type { Category } from '../../shared/types/product';

const SHORTCUTS = [
  { label: 'New in', to: '/', tint: 'from-indigo-500 to-violet-600' },
  { label: 'Hot deals', to: '/?featured=true', tint: 'from-orange-500 to-rose-500' },
  { label: 'Women', to: '/women', tint: 'from-pink-500 to-fuchsia-600' },
  { label: 'Men', to: '/men', tint: 'from-sky-500 to-cyan-600' },
];

/**
 * Category browser as a sheet.
 *
 * Presented as a 2-up image grid rather than a text list: for a fashion
 * catalogue the photograph *is* the label, and a list of words asks the
 * shopper to translate "Outerwear" into a mental image before they can decide.
 */
export function CategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: categories, isLoading } = useCategories();

  function go(to: string): void {
    navigate(to);
    onClose();
  }

  // One level deep: leaf categories where they exist, parents otherwise.
  const leaves: Category[] = (categories ?? []).flatMap((parent) =>
    parent.children.length > 0 ? parent.children : [parent],
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Browse" maxHeight="tall">
      <div className="space-y-6 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          {SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => go(shortcut.to)}
              className={`flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-br ${shortcut.tint} px-4 py-3.5 text-left text-sm font-bold text-white shadow-e2 transition-transform duration-200 active:scale-95`}
            >
              {shortcut.label}
              <IconArrowRight size={16} className="shrink-0 opacity-80" />
            </button>
          ))}
        </div>

        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
            <IconSparkles size={13} className="text-brand" />
            All categories
          </h3>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {leaves.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => go(`/?category=${category.slug}`)}
                  className="group relative overflow-hidden rounded-2xl shadow-e2 transition-transform duration-200 active:scale-95"
                >
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    ratio="wide"
                    sizes="45vw"
                    className="rounded-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-left">
                    <span className="block text-sm font-bold text-white">{category.name}</span>
                    <span className="block text-[11px] text-white/70">
                      {category.productCount} pieces
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
