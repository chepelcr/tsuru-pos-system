/**
 * Selection rules for the specific-excise taxes (Hacienda Nota 8, codes 03-06).
 *
 * These taxes are not a rate on a base: each one multiplies a per-unit amount
 * from the data-api catalog, and picking the WRONG amount is silent — the
 * document computes, files, and misdeclares. Two of those choices can be made
 * for the operator instead of asked:
 *
 *   * **04 Bebidas alcohólicas** — the catalog splits into brackets by alcohol
 *     degree ("Hasta 15% alcohol", "Más de 15% y hasta 30% alcohol", "Más de
 *     30% alcohol"). The line already carries the degree, so the bracket is
 *     determined, not a preference.
 *   * **05 ISEBEC** — the same tax covers packaged non-alcoholic beverages AND
 *     toilet soap, which are priced differently (soap is per GRAM). Which one
 *     applies follows from the product's CABYS.
 *
 * Bounds are parsed from the catalog description rather than hardcoded, so a
 * bracket added or re-priced by Hacienda flows through without a code change.
 */

/** A per-unit amount row as the data-api serves it. */
export interface TaxAmountOption {
  id?: number | string;
  amount?: number | null;
  description?: string | null;
}

function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Inclusive-upper bounds parsed from a bracket description. */
export interface AlcoholBracket {
  min: number; // exclusive
  max: number; // inclusive; Infinity for the open-ended bracket
}

/**
 * Read the alcohol range out of a catalog description.
 *
 * "Hasta 15% alcohol"                  -> (0, 15]
 * "Más de 15% y hasta 30% alcohol"     -> (15, 30]
 * "Más de 30% alcohol"                 -> (30, ∞)
 *
 * Returns null when the description carries no range, so an unrelated row can
 * never accidentally win the match.
 */
export function parseAlcoholBracket(
  description: string | null | undefined
): AlcoholBracket | null {
  const text = normalize(description);
  if (!text.includes("alcohol")) return null;

  const numbers = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map((m) =>
    parseFloat(m[1].replace(",", "."))
  );
  if (numbers.length === 0) return null;

  const hasMasDe = text.includes("mas de");
  const hasHasta = text.includes("hasta");

  if (hasMasDe && hasHasta && numbers.length >= 2) {
    return { min: numbers[0], max: numbers[1] };
  }
  if (hasMasDe) return { min: numbers[0], max: Infinity };
  if (hasHasta) return { min: 0, max: numbers[0] };
  return null;
}

/**
 * The code-04 amount for a given alcohol degree, or null when nothing matches.
 *
 * Null is deliberate: guessing a bracket would put a wrong excise on a legal
 * document, and an unmatched degree is better surfaced to the operator.
 */
export function alcoholAmountFor<T extends TaxAmountOption>(
  percentage: number | null | undefined,
  amounts: readonly T[]
): T | null {
  if (percentage === null || percentage === undefined) return null;
  if (!Number.isFinite(percentage) || percentage < 0) return null;

  for (const option of amounts) {
    const bracket = parseAlcoholBracket(option.description);
    if (!bracket) continue;
    if (percentage > bracket.min && percentage <= bracket.max) return option;
    // "Hasta N%" is written with min 0, so 0% itself belongs to it.
    if (bracket.min === 0 && percentage === 0) return option;
  }
  return null;
}

/**
 * CABYS prefixes that change how a line is taxed.
 *
 * The previous constants — "2202" for beverages and "3401" for soap — are
 * Harmonized System headings, NOT CABYS. No CABYS code begins with either, so
 * every rule keyed on them was dead: the beverage branch never ran and the
 * soap branch never ran. Verified against the live catalog (20 501 rows).
 *
 * CABYS is its own 13-digit taxonomy:
 *   3532101010101  Jabón medicinal de tocador, en barras...
 *   3532101010199  Jabón de tocador n.c.p., en barras...
 *   3532101010200  Jabón PARA LAVAR  <- same family, NOT "de tocador"
 *   2449001000000  Bebidas gaseosas azucaradas, edulcoradas o aromatizadas
 *
 * Note the third line: a short "3532" prefix over-matches into laundry soap,
 * which the excise does not cover. The prefix below is therefore the narrower
 * `35321010101`, which isolates the two "de tocador" rows.
 */
export const CabysPrefix = {
  /** Jabón de tocador — ISEBEC (05), priced per GRAM. */
  TOILET_SOAP: "35321010101",
  /** Bebidas gaseosas / envasadas no alcohólicas — ISEBEC (05), per volume. */
  PACKAGED_BEVERAGE: "2449",
} as const;

export function cabysHasPrefix(
  cabys: string | null | undefined,
  prefix: string
): boolean {
  return typeof cabys === "string" && cabys.startsWith(prefix);
}

export function isToiletSoap(cabys: string | null | undefined): boolean {
  return cabysHasPrefix(cabys, CabysPrefix.TOILET_SOAP);
}

export function isPackagedBeverage(cabys: string | null | undefined): boolean {
  return cabysHasPrefix(cabys, CabysPrefix.PACKAGED_BEVERAGE);
}

/**
 * The code-05 amount implied by the product's CABYS.
 *
 * Soap and beverages share tax code 05 but are priced on different units, so
 * the CABYS decides. Anything else returns null and the operator picks.
 */
export function isebecAmountFor<T extends TaxAmountOption>(
  cabys: string | null | undefined,
  amounts: readonly T[]
): T | null {
  if (isToiletSoap(cabys)) {
    return (
      amounts.find((a) => normalize(a.description).includes("jabon de tocador")) ??
      null
    );
  }
  if (isPackagedBeverage(cabys)) {
    return (
      amounts.find((a) => normalize(a.description).includes("gaseosas")) ?? null
    );
  }
  return null;
}


/**
 * Proporcion de alcohol absoluto = volumen (litros) x grado.
 *
 * Rounded to the 5 decimal places the v4.4 XSD allows (FractionDigits=5).
 * A 355 ml can at 4.5% is 0.015975 unrounded — six decimals — and Hacienda
 * rejects the document on the schema. Below a certain volume x degree the
 * result rounds to zero, which Hacienda rejects separately with -470, so
 * callers must check for it rather than send it.
 */
export function isebaVolume(volumeLitres: number): number {
  // CantidadUnidadMedida is capped at 2 fraction digits — tighter than every
  // other numeric field on the line. This is the millilitre trap: 700 ml, 750
  // ml and 1 L divide cleanly into litres and pass, while the common can and
  // bottle sizes do not. 355 ml as 0.355 L is rejected on the schema before
  // any arithmetic is looked at:
  //
  //   cvc-fractionDigits-valid: Value '0.35500' has 3 fraction digits, but the
  //   number of fraction digits has been limited to 2.
  return Math.round(volumeLitres * 100) / 100;
}

export function isebaProportion(volumeLitres: number, alcoholPercentage: number): number {
  // Derived from the ROUNDED volume, because that is the volume the document
  // declares — deriving it from the raw 0.355 would make the declared quantity
  // and the declared proportion disagree.
  const raw = isebaVolume(volumeLitres) * (alcoholPercentage / 100);
  return Math.round(raw * 1e5) / 1e5;
}

/**
 * Monto = cantidad de linea x proporcion x impuesto unitario.
 *
 * Computed from the ROUNDED proportion: Hacienda recomputes the amount from
 * the Proporcion the document declares, so using the unrounded figure here
 * makes the two disagree.
 */
export function isebaAmount(
  detailQuantity: number,
  volumeLitres: number,
  alcoholPercentage: number,
  taxUnitAmount: number
): number {
  const proportion = isebaProportion(volumeLitres, alcoholPercentage);
  return Math.round(detailQuantity * proportion * taxUnitAmount * 1e5) / 1e5;
}


/**
 * ISEBEC (código 05) — one tax code, two units.
 *
 * The code covers packaged non-alcoholic beverages AND toilet soap, and they
 * are not priced the same way. Which formula applies follows from the CABYS:
 *
 *   * **Jabón de tocador** (`35321010101…`) is priced PER GRAM, so the
 *     per-unit amount multiplies the weight directly. No volume is involved.
 *   * **Everything else** uses the spec's volume formula:
 *     `Monto = Cantidad × CantidadUnidadMedida × (ImpuestoUnidad / VolumenUnidadConsumo)`
 *
 * The old code branched on CABYS "2202"/"3401", which are Harmonized System
 * headings and match no CABYS at all — so the volume divisor was never applied
 * and every line fell through to `quantity × volume × unit`, which is not a
 * formula the spec defines.
 */
export function isebecAmount(params: {
  cabys?: string | null;
  detailQuantity: number;
  /** CantidadUnidadMedida. Unused for soap, which prices off the volume field. */
  quantity: number;
  /** VolumenUnidadConsumo — litres for a drink, GRAMS for toilet soap. */
  volumeConsumption?: number | null;
  taxUnitAmount: number;
}): number {
  const { cabys, detailQuantity, quantity, volumeConsumption, taxUnitAmount } = params;

  // Two formulas. Verbatim from the Hacienda calculation rules for código 05:
  //
  //   Bebidas: "la multiplicación del campo Cantidad por el campo Cantidad de
  //     la unidad de medida a utilizar, multiplicado por el resultado de
  //     DIVIDIR el campo Impuesto por Unidad entre el campo Volumen por Unidad
  //     de Consumo."
  //       Monto = Cantidad x CantidadUnidadMedida x (ImpuestoUnidad / VolumenUnidadConsumo)
  //
  //   Jabón de tocador: "la multiplicación del campo Cantidad por el campo
  //     Volumen por Unidad de Consumo por Impuesto por Unidad."
  //       Monto = Cantidad x VolumenUnidadConsumo x ImpuestoUnidad
  //
  // Note what changes between them, because it is easy to get backwards: soap
  // MULTIPLIES by VolumenUnidadConsumo where beverages DIVIDE by it, and soap
  // does not use CantidadUnidadMedida at all. The field simply carries a
  // different unit — grams for soap, litres of consumption volume for a drink.
  //
  // Not implemented: the "Detalle de productos del surtido, paquetes o combos"
  // variant, where this amount is the sum of the individual código-05 amounts
  // of the surtido detail lines, multiplied by the main line's quantity when it
  // carries more than one surtido unit. The surtido node is not modelled yet.
  if (isToiletSoap(cabys)) {
    return round5(detailQuantity * (volumeConsumption ?? 0) * taxUnitAmount);
  }

  // The consumption volume carries the same 2-decimal cap as the quantity: a
  // 355 ml unit sent as 0.355 is rejected on the schema, not on the arithmetic.
  const volume = isebaVolume(volumeConsumption ?? 0);
  if (!volume) return 0;
  return round5(detailQuantity * quantity * (taxUnitAmount / volume));
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}
