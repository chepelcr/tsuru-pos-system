// Money formatting lives in `@/lib/money` — a date module is not its home,
// and this copy rounded to whole colones.

import { formatOrderDate } from '@/lib/orderDate';

/**
 * A timestamp for display: weekday, date and time.
 *
 * ⚠️ For an ORDER's `creation_date` / `delivery_date`, use `formatOrderDate`
 * instead. This function was being used on them, and it is
 * `new Date(s).toLocaleDateString(...)` — which parses a bare `YYYY-MM-DD` as UTC
 * midnight, i.e. 18:00 the previous day in Costa Rica, so every order date
 * rendered ONE DAY EARLY. `formatOrderDate` builds the date from local-time
 * components precisely to avoid that, and `formatOrderDateTime` below routes the
 * old call sites through it.
 *
 * This one stays for genuine timestamps (`created_on`, `updated_on`), which carry
 * a time and therefore parse unambiguously.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * An order date, formatted long — the safe replacement for `formatDate` on
 * `creation_date` / `delivery_date`.
 *
 * Delegates to `formatOrderDate`, which handles both the ISO the API now sends
 * and the `DD/MM/YYYY` older payloads carried, and constructs the date in local
 * time so it never shows the previous day.
 */
export function formatOrderDateTime(dateStr: string | null | undefined, locale = 'es-CR'): string {
  return formatOrderDate(dateStr ?? '', locale, 'long');
}
