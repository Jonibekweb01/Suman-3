import { Link } from 'react-router-dom';
import type { ProductRow } from '../../shared/types';
import { Badge, IconEdit, IconTrash, Skeleton } from '../../shared/ui';
import { formatPrice } from '../../shared/lib/utils';

function stockState(product: ProductRow): { label: string; tone: 'success' | 'danger' } {
  return product.inStock ? { label: 'In stock', tone: 'success' } : { label: 'Out of stock', tone: 'danger' };
}

export function ProductMobileList({
  products,
  onArchive,
  isLoading = false,
}: {
  products: ProductRow[];
  onArchive: (product: ProductRow) => void;
  isLoading?: boolean;
}) {
  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-2 lg:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="card flex gap-3 p-3">
            <Skeleton className="size-16 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="card px-4 py-10 text-center lg:hidden">
        <p className="font-medium">No products match</p>
        <p className="mt-1 text-[13px] text-muted">Adjust the filters, or add your first product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 lg:hidden">
      {products.map((product) => {
        const stock = stockState(product);
        return (
          <article key={product.id} className="card p-3">
            <div className="flex gap-3">
              {product.images[0]?.url ? (
                <img src={product.images[0].url} alt="" loading="lazy" className="size-16 shrink-0 rounded-md border border-line object-cover" />
              ) : (
                <div className="size-16 shrink-0 rounded-md bg-sunken" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium">{product.title}</h2>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {product.brand ? `${product.brand} · ` : ''}{product.category.name}
                    </p>
                  </div>
                  <Badge tone={stock.tone}>{stock.label}</Badge>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular-nums">{formatPrice(product.price, product.currency)}</p>
                    <p className="text-[12px] text-muted">{product.sold} sold · {product.gender.toLowerCase()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Link to={`/products/${product.id}`} aria-label={`Edit ${product.title}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                      <IconEdit size={16} />
                    </Link>
                    <button type="button" onClick={() => onArchive(product)} aria-label={`Archive ${product.title}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
