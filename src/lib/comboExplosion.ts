import type { Product } from '@/types';

/**
 * Combo → component cart lines (TSR-154).
 *
 * A combo carries its OWN price — that is the point of a combo — but it cannot
 * reach a fiscal document as a single flat line. Its components can sit at
 * different IVA rates (a soda at 13% beside an exempt basic item), and one line
 * can hold only one rate, so a flat combo line would put the wrong tax on a
 * real invoice.
 *
 * So the combo explodes at add-to-cart time and the price difference is
 * distributed across the components as a per-line discount percentage. Each
 * component keeps its own CABYS and its own tax configuration, and the existing
 * `discountCalculationService` cascade does the rest.
 */

export interface ComboComponent {
  product: Product;
  /** How many of this component one combo contains. */
  quantity: number;
}

export interface ExplodedLine {
  product: Product;
  qty: number;
  /** Percentage discount that reconciles the components to the combo price. */
  lineDiscount: number;
  /** Names the combo on the receipt so the customer recognises what they bought. */
  lineNote: string;
}

/** Sum of a component list at catalog prices, for one combo. */
export function componentsListPrice(components: ComboComponent[]): number {
  return components.reduce(
    (sum, c) => sum + Number(c.product.price ?? 0) * c.quantity,
    0,
  );
}

/**
 * Explode `comboQty` combos into component lines.
 *
 * The discount percentage is the SAME on every component — proportional
 * distribution — because that is the only split that leaves each component's
 * taxable base in the same ratio it had at catalog price. Distributing by
 * anything else would quietly move value between tax rates.
 */
export function explodeCombo(
  combo: Product,
  components: ComboComponent[],
  comboQty = 1,
): ExplodedLine[] {
  if (components.length === 0) return [];

  const listPrice = componentsListPrice(components);
  const comboPrice = Number(combo.price ?? 0);

  // A combo priced at or above its parts carries no discount. Clamped rather
  // than allowed negative: a "negative discount" would silently raise the
  // component's taxable base above its catalog price.
  const discountPct =
    listPrice > 0 && comboPrice < listPrice
      ? ((listPrice - comboPrice) / listPrice) * 100
      : 0;

  const comboName = combo.name ?? combo.description ?? '';

  return components.map((c) => ({
    product: c.product,
    qty: c.quantity * comboQty,
    lineDiscount: discountPct,
    lineNote: comboName,
  }));
}

/**
 * Fold exploded lines into an existing cart keyed by product id.
 *
 * A product can appear both on its own and inside a combo. Quantities fold the
 * way adding it twice would, but a line that already carries a DIFFERENT
 * discount is left alone and the combo's copy is kept separate — merging them
 * would apply one combo's discount to a product the customer bought at full
 * price.
 */
export function mergeExplodedLines<T extends { product: Product; qty: number; lineDiscount?: number; lineNote?: string }>(
  cart: Record<string, T>,
  exploded: ExplodedLine[],
  makeItem: (line: ExplodedLine) => T,
): Record<string, T> {
  const next = { ...cart };

  for (const line of exploded) {
    const key = line.product.product_id;
    const existing = next[key];

    const sameDiscount =
      existing && (existing.lineDiscount ?? 0) === line.lineDiscount;

    if (existing && sameDiscount) {
      next[key] = { ...existing, qty: existing.qty + line.qty };
    } else if (!existing) {
      next[key] = makeItem(line);
    } else {
      // Distinct discount: keep it as its own line so neither price is lost.
      next[`${key}::combo`] = makeItem(line);
    }
  }

  return next;
}
