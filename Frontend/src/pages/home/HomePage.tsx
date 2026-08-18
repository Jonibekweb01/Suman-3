import { Link } from "react-router-dom";
import { useCategories } from "../../entities/catalog/api";
import { CatalogView } from "../../widgets/catalog/CatalogView";
import { DealOfDayGrid } from "../../widgets/deal-of-day/DealOfDayGrid";
import { HeroCarousel } from "../../widgets/hero/HeroCarousel";
import {
  IconArrowRight,
  IconReturn,
  IconShield,
  IconTruckFast,
  Image,
  Skeleton,
} from "../../shared/ui";
import type { Category } from "../../shared/types/product";

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children),
  ]);
}

const TRUST_POINTS = [
  { icon: IconTruckFast, label: "Free delivery", hint: "over 500 000 so’m" },
  { icon: IconReturn, label: "14-day returns", hint: "no questions asked" },
  { icon: IconShield, label: "Secure checkout", hint: "protected payment" },
];

/**
 * Trust strip directly under the hero.
 *
 * Placed above the first product, not in the footer: the objections it answers
 * (what if it does not fit, is my card safe) arrive *before* the shopper picks
 * something, and an answer that comes after the decision is too late.
 */
function TrustStrip() {
  return (
    <section className="container-page py-4" aria-label="Why shop with Suman">
      <div className="scroll-strip bleed-x gap-3 py-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {TRUST_POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <div
              key={point.label}
              className="snap-item flex min-w-[13rem] items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-none"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-tight font-bold">
                  {point.label}
                </span>
                <span className="block text-[11px] text-muted">
                  {point.hint}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Category rail.
 *
 * Edge-to-edge and snap-scrolled on mobile — a horizontal strip that runs off
 * the screen edge signals "there is more this way" far better than a grid that
 * stops politely inside a margin — and a grid from `sm` up where the extra
 * width makes scrolling pointless.
 */
function CategoryStrip() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="container-page py-6">
        <div className="scroll-strip bleed-x gap-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="aspect-[3/4] w-40 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const featured = flattenCategories(categories ?? []);
  if (featured.length === 0) return null;

  return (
    <section className="container-page py-6" aria-labelledby="shop-by-category">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2
          id="shop-by-category"
          className="text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Shop by category
        </h2>
        <Link
          to="/women"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-strong transition-transform active:scale-95"
        >
          See all
          <IconArrowRight size={15} />
        </Link>
      </div>

      <div className="scroll-strip bleed-x gap-3 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
        {featured.map((category) => (
          <Link
            key={category.id}
            to={`/?category=${category.slug}`}
            className="snap-item group relative w-40 shrink-0 overflow-hidden rounded-card border border-line shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2 sm:w-auto"
          >
            <div className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
              <Image
                src={category.imageUrl}
                alt={category.name}
                ratio="portrait"
                sizes="(max-width: 639px) 40vw, 25vw"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/25 to-transparent"
            />
            <span className="absolute inset-x-0 bottom-0 p-3.5">
              <span className="block text-base font-extrabold tracking-tight text-white">
                {category.name}
              </span>
              <span className="block text-[11px] font-medium text-white/70">
                {category.productCount} pieces
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <TrustStrip />
      <CategoryStrip />
      <div className="container-page">
        <DealOfDayGrid />
      </div>
      <CatalogView
        title="New in"
        description="The latest pieces to land — considered materials and minimal silhouettes, refreshed weekly."
      />
    </>
  );
}
