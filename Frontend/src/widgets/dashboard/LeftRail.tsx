import { useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useCategories } from '../../entities/catalog/api';
import { cn } from '../../shared/lib/cn';
import { useRailCollapsed } from '../../shared/lib/railCollapsed';
import { RailFilterOutlet } from '../../shared/lib/railSlot';
import {
  IconBag,
  IconChevronDown,
  IconFlame,
  IconHeart,
  IconHome,
  IconPanelLeft,
  IconSparkles,
} from '../../shared/ui';

const NAV_ITEMS = [
  { to: '/', label: 'New in', icon: IconHome, end: true },
  { to: '/?featured=true', label: 'Hot deals', icon: IconFlame, end: false },
  { to: '/women', label: 'Women', icon: IconSparkles, end: false },
  { to: '/men', label: 'Men', icon: IconSparkles, end: false },
  { to: '/wishlist', label: 'Wishlist', icon: IconHeart, end: false },
  { to: '/orders', label: 'Orders', icon: IconBag, end: false },
];

function CategoryTree({ collapsed }: { collapsed: boolean }) {
  const { data: categories } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const activeSlug = searchParams.get('category');

  if (collapsed || !categories || categories.length === 0) return null;

  function select(slug: string): void {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (next.get('category') === slug) next.delete('category');
        else next.set('category', slug);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <section className="mt-6">
      <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
        Categories
      </p>

      <ul className="space-y-0.5">
        {categories.map((parent) => {
          const hasChildren = parent.children.length > 0;
          const expanded = openIds.has(parent.id);
          const active = activeSlug === parent.slug;

          return (
            <li key={parent.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => select(parent.slug)}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                    active ? 'bg-brand-soft text-brand-strong' : 'text-ink-soft hover:bg-surface-sunken',
                  )}
                >
                  {parent.name}
                  <span className="ml-1.5 text-xs font-medium text-muted tabular-nums">
                    {parent.productCount}
                  </span>
                </button>

                {hasChildren && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIds((current) => {
                        const next = new Set(current);
                        if (next.has(parent.id)) next.delete(parent.id);
                        else next.add(parent.id);
                        return next;
                      })
                    }
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} ${parent.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <IconChevronDown
                      size={15}
                      className={cn('transition-transform duration-200', expanded && 'rotate-180')}
                    />
                  </button>
                )}
              </div>

              {hasChildren && expanded && (
                <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-line pl-2">
                  {parent.children.map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => select(child.slug)}
                        className={cn(
                          'w-full rounded-lg px-3 py-1.5 text-left text-[13px] font-medium transition-colors',
                          activeSlug === child.slug
                            ? 'bg-brand-soft text-brand-strong'
                            : 'text-muted hover:bg-surface-sunken hover:text-ink',
                        )}
                      >
                        {child.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Desktop left rail: navigation, category tree, and whatever filters the
 * current page publishes into the slot.
 *
 * The rail carries no width of its own — it fills the `--rail-w` grid track
 * the shell hands it, so collapsing is a single change on the layout wrapper.
 */
export function LeftRail() {
  const collapsed = useRailCollapsed((state) => state.collapsed);
  const toggle = useRailCollapsed((state) => state.toggle);

  return (
    <aside className="hidden min-w-0 lg:block" aria-label="Browse">
      <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-x-hidden overflow-y-auto overscroll-contain pb-8 no-scrollbar">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mb-3 grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <IconPanelLeft size={17} />
        </button>

        <nav aria-label="Sections">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-brand-soft text-brand-strong'
                          : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
                      )
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <CategoryTree collapsed={collapsed} />

        {!collapsed && (
          <div className="mt-6 border-t border-line pt-2">
            <RailFilterOutlet />
          </div>
        )}
      </div>
    </aside>
  );
}
