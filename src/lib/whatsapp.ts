/**
 * WhatsApp message composer + deep-link opener.
 *
 * Ported from the dashboard `lib/whatsapp.ts`, with the message body **fully
 * i18n'd** (CLAUDE.md §10 forbids hard-coded Spanish literals). Because a plain
 * lib module can't call `useLanguage()`, the localized line templates are passed
 * in by the caller (which has access to `t()`); this module only assembles them.
 *
 * The currency symbol (`₡`) stays literal — it's a locale formatter glyph, not
 * translatable copy (CLAUDE.md §10.3).
 */

export interface WhatsAppCartItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Localized line templates, resolved by the caller via `t()`. Each value is a
 * fully-rendered string (params already interpolated) EXCEPT `productLine`,
 * which is a callback so the composer can render one row per item.
 */
export interface WhatsAppMessageStrings {
  /** Opening greeting, e.g. "¡Hola! Me gustaría hacer un pedido:" */
  greeting: string;
  /** Section header for the client block, e.g. "*DATOS DEL CLIENTE:*" */
  clientHeader: string;
  /** Rendered "Nombre: {name}" line. */
  clientName: string;
  /** Rendered "Teléfono: {phone}" line. */
  clientPhone: string;
  /** Section header for products, e.g. "*PRODUCTOS:*" */
  productsHeader: string;
  /** Per-product line renderer — `formattedAmount` already includes "₡". */
  productLine: (item: WhatsAppCartItem, formattedAmount: string) => string;
  /** Rendered total line, e.g. "*TOTAL: ₡{total}*". */
  total: string;
}

/** Formats a colón amount with the locale grouping. The `₡` glyph is not i18n. */
export function formatColones(amount: number): string {
  return `₡${amount.toLocaleString('es-CR')}`;
}

/**
 * Build a WhatsApp pre-filled order message from localized line templates.
 * Returns the raw (un-encoded) text — pass it to {@link openWhatsApp}.
 */
export function generateWhatsAppMessage(
  items: WhatsAppCartItem[],
  strings: WhatsAppMessageStrings,
): string {
  const lines: string[] = [];

  lines.push(strings.greeting, '');
  lines.push(strings.clientHeader);
  lines.push(strings.clientName);
  lines.push(strings.clientPhone, '');
  lines.push(strings.productsHeader);

  for (const item of items) {
    lines.push(strings.productLine(item, formatColones(item.price * item.quantity)));
  }

  lines.push('', strings.total);

  return lines.join('\n');
}

/** Strip everything but digits so `wa.me/{phone}` accepts the number. */
function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Open a WhatsApp chat (`https://wa.me/{phone}?text=…`) in a new tab. When the
 * phone is empty, opens a generic `wa.me/?text=` link so the user can pick a
 * recipient.
 */
export function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = sanitizePhone(phone);
  const encoded = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
