/**
 * Backend order dates, rendered for reading.
 *
 * The orders list and the order detail page each carried their own copy of
 * this, identical but for `month: 'short'` vs `'long'` — so the parsing bug
 * below had to be fixed twice and had been fixed neither time.
 */

/** How the month is spelled: `short` in lists, `long` on a detail page. */
export type OrderDateStyle = 'short' | 'long';

/**
 * Parse a `DD/MM/YYYY` or `YYYY-MM-DD` backend date into a localized date.
 *
 * Both are CALENDAR dates — a delivery day, not an instant — so both are read
 * as local-time components. `new Date('2026-09-20')` would not: the spec parses
 * a bare date-only ISO string as UTC midnight, which in Costa Rica (UTC-6)
 * renders as the 19th. Imported orders store `DD/MM/YYYY` and were always
 * fine; manual orders store `YYYY-MM-DD`, so every pedido captured in the POS
 * showed its creation and delivery dates one day early.
 *
 * Anything else is treated as a full timestamp — an instant — and left to the
 * engine to place in the viewer's zone.
 */
export function formatOrderDate(
  dateStr: string | undefined,
  locale: string,
  style: OrderDateStyle = 'short',
): string {
  if (!dateStr) return '';

  let date: Date;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (dmy) {
    date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  } else if (ymd) {
    date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  } else {
    date = new Date(dateStr);
  }

  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: style,
    day: 'numeric',
  });
}
