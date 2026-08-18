import { useState } from 'react';
import { cn } from '../../shared/lib/utils';
import { Button, IconPlus, IconTrash, Input } from '../../shared/ui';

export interface ColorRow {
  name: string;
  hex: string;
}

/** Stock keyed by `${color}::${size}` — a flat map is far easier to update
 *  immutably than a nested object, and it survives a colour being renamed. */
export type StockMap = Record<string, number>;

export interface VariantMatrixValue {
  colors: ColorRow[];
  sizes: string[];
  stock: StockMap;
}

export function stockKey(color: string, size: string): string {
  return `${color}::${size}`;
}

const SIZE_PRESETS: Record<string, string[]> = {
  Apparel: ['XS', 'S', 'M', 'L', 'XL'],
  'Apparel + XXL': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Numeric: ['36', '38', '40', '42', '44'],
  'One size': ['ONE SIZE'],
};

/**
 * Colour × size grid for product variants.
 *
 * The API models each colour/size pair as its own row with its own stock, but
 * asking an admin to fill in fifteen near-identical forms would be miserable.
 * They define the two axes here and the grid generates the combinations; the
 * parent flattens it back into the API's variant array on submit.
 */
export function VariantMatrix({
  value,
  onChange,
  error,
}: {
  value: VariantMatrixValue;
  onChange: (next: VariantMatrixValue) => void;
  error?: string;
}) {
  const [colorDraft, setColorDraft] = useState<ColorRow>({ name: '', hex: '#111111' });
  const [sizeDraft, setSizeDraft] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const { colors, sizes, stock } = value;

  function addColor(): void {
    const name = colorDraft.name.trim();
    if (!name) return;
    if (colors.some((color) => color.name.toLowerCase() === name.toLowerCase())) return;
    onChange({ ...value, colors: [...colors, { name, hex: colorDraft.hex }] });
    setColorDraft({ name: '', hex: '#111111' });
  }

  function removeColor(name: string): void {
    // Drop the colour's stock entries too, or they would linger as orphans and
    // reappear if the same colour name is added back later.
    const nextStock: StockMap = {};
    for (const [key, quantity] of Object.entries(stock)) {
      if (!key.startsWith(`${name}::`)) nextStock[key] = quantity;
    }
    onChange({ ...value, colors: colors.filter((color) => color.name !== name), stock: nextStock });
  }

  function addSize(raw: string): void {
    const size = raw.trim().toUpperCase();
    if (!size || sizes.includes(size)) return;
    onChange({ ...value, sizes: [...sizes, size] });
    setSizeDraft('');
  }

  function removeSize(size: string): void {
    const nextStock: StockMap = {};
    for (const [key, quantity] of Object.entries(stock)) {
      if (!key.endsWith(`::${size}`)) nextStock[key] = quantity;
    }
    onChange({ ...value, sizes: sizes.filter((item) => item !== size), stock: nextStock });
  }

  function applyPreset(preset: string): void {
    const merged = [...new Set([...sizes, ...(SIZE_PRESETS[preset] ?? [])])];
    onChange({ ...value, sizes: merged });
  }

  function setStock(color: string, size: string, quantity: number): void {
    onChange({
      ...value,
      stock: { ...stock, [stockKey(color, size)]: Math.max(0, quantity) },
    });
  }

  /** Fills every cell at once — the common case when stocking a new style. */
  function applyBulkStock(): void {
    const quantity = Number(bulkStock);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    const next: StockMap = { ...stock };
    for (const color of colors) {
      for (const size of sizes) next[stockKey(color.name, size)] = quantity;
    }
    onChange({ ...value, stock: next });
    setBulkStock('');
  }

  const totalUnits = colors.reduce(
    (sum, color) =>
      sum + sizes.reduce((rowSum, size) => rowSum + (stock[stockKey(color.name, size)] ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* --- Colours --- */}
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
          Colours <span className="text-danger">*</span>
        </p>

        {colors.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {colors.map((color) => (
              <li
                key={color.name}
                className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-1 pl-2 pr-1"
              >
                <span
                  style={{ backgroundColor: color.hex }}
                  className="size-4 rounded-full ring-1 ring-inset ring-black/10"
                />
                <span className="text-[13px]">{color.name}</span>
                <button
                  type="button"
                  onClick={() => removeColor(color.name)}
                  aria-label={`Remove ${color.name}`}
                  className="grid size-5 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <IconTrash size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="color"
            value={colorDraft.hex}
            onChange={(event) => setColorDraft((draft) => ({ ...draft, hex: event.target.value }))}
            aria-label="Colour swatch"
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line-strong bg-surface p-1"
          />
          <input
            value={colorDraft.name}
            onChange={(event) => setColorDraft((draft) => ({ ...draft, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addColor();
              }
            }}
            placeholder="Colour name, e.g. Navy"
            aria-label="Colour name"
            className="h-10 flex-1 rounded-md border border-line-strong bg-surface px-3 text-sm focus:border-brand focus:outline-none"
          />
          <Button variant="secondary" onClick={addColor} leftIcon={<IconPlus size={15} />}>
            Add
          </Button>
        </div>
      </div>

      {/* --- Sizes --- */}
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
          Sizes <span className="text-danger">*</span>
        </p>

        {sizes.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {sizes.map((size) => (
              <li
                key={size}
                className="flex items-center gap-1.5 rounded-md border border-line-strong bg-surface py-1 pl-2.5 pr-1"
              >
                <span className="text-[13px]">{size}</span>
                <button
                  type="button"
                  onClick={() => removeSize(size)}
                  aria-label={`Remove size ${size}`}
                  className="grid size-5 place-items-center rounded text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <IconTrash size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            value={sizeDraft}
            onChange={(event) => setSizeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSize(sizeDraft);
              }
            }}
            placeholder="Size, e.g. M"
            aria-label="Size"
            className="h-10 flex-1 rounded-md border border-line-strong bg-surface px-3 text-sm focus:border-brand focus:outline-none"
          />
          <Button
            variant="secondary"
            onClick={() => addSize(sizeDraft)}
            leftIcon={<IconPlus size={15} />}
          >
            Add
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.keys(SIZE_PRESETS).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-line-strong px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-brand hover:text-ink"
            >
              + {preset}
            </button>
          ))}
        </div>
      </div>

      {/* --- Stock grid --- */}
      {colors.length > 0 && sizes.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-[13px] font-medium text-ink-soft">
              Stock per variant
              <span className="ml-2 font-normal text-muted">
                {colors.length * sizes.length} variants · {totalUnits} units
              </span>
            </p>

            <div className="flex items-end gap-2">
              <Input
                value={bulkStock}
                onChange={(event) => setBulkStock(event.target.value)}
                type="number"
                min={0}
                placeholder="0"
                aria-label="Set all variants to"
                wrapperClassName="w-24"
                className="h-9"
              />
              <Button variant="secondary" size="sm" onClick={applyBulkStock} disabled={!bulkStock}>
                Set all
              </Button>
            </div>
          </div>

          <div className="table-scroll rounded-md border border-line">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th scope="col" className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Colour
                  </th>
                  {sizes.map((size) => (
                    <th
                      key={size}
                      scope="col"
                      className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-wide text-muted"
                    >
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color) => (
                  <tr key={color.name} className="border-b border-line last:border-0">
                    <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: color.hex }}
                          className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                        />
                        {color.name}
                      </span>
                    </th>
                    {sizes.map((size) => {
                      const quantity = stock[stockKey(color.name, size)] ?? 0;
                      return (
                        <td key={size} className="px-1.5 py-1.5">
                          <input
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(event) =>
                              setStock(color.name, size, Number(event.target.value))
                            }
                            aria-label={`Stock for ${color.name} ${size}`}
                            className={cn(
                              'h-9 w-full min-w-14 rounded border bg-surface px-2 text-center text-sm focus:border-brand focus:outline-none',
                              quantity === 0
                                ? 'border-line text-muted'
                                : quantity <= 5
                                  ? 'border-warning/40 text-warning'
                                  : 'border-line-strong',
                            )}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
