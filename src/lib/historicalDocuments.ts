import type { HistoricalDocument } from '@/types/historicalDocument';

export const HISTORICAL_STATUS_KEYS = {
  0: 'historical.status.processing',
  1: 'historical.status.accepted',
  2: 'historical.status.partial',
  3: 'historical.status.rejected',
} as const;

export function formatHistoricalAmount(value: HistoricalDocument['total_amount'], language: string): string {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  // The history contract has no currency. Do not assign CRC to foreign vouchers.
  return new Intl.NumberFormat(language === 'es' ? 'es-CR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(amount);
}

export function formatHistoricalDate(value: string | null | undefined, language: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(language === 'es' ? 'es-CR' : 'en-US');
}

export function historicalErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const fields = error as Record<string, unknown>;
    const message = fields.message ?? fields.description ?? fields.detail ?? fields.detalle;
    if (typeof message === 'string') return fields.code ? `${fields.code}: ${message}` : message;
  }
  return JSON.stringify(error) ?? '—';
}

/** CSV protects cells supplied by issuers/receivers from spreadsheet formulas. */
export function historicalDocumentsCsv(documents: HistoricalDocument[], t: (key: string) => string): string {
  const cell = (value: unknown) => {
    const raw = value == null ? '' : String(value);
    const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows: unknown[][] = [[
    t('documents.detail.key'), t('historical.documentType'), t('historical.branch'), t('historical.terminal'),
    t('historical.consecutive'), t('historical.emittedAt'), t('historical.issuer'), t('historical.issuerId'),
    t('documents.detail.receiver'), t('historical.receiverId'), t('historical.total'), t('historical.tax'),
    t('historical.atvStatus'), t('historical.validatedAt'), t('historical.source'),
  ], ...documents.map((doc) => [
    doc.clave, doc.document_type, doc.branch_number, doc.terminal_number, doc.consecutive_key,
    doc.emission_date, doc.issuer_name, doc.issuer_id_number, doc.receiver_name, doc.receiver_id_number,
    doc.total_amount, doc.tax_total, t(HISTORICAL_STATUS_KEYS[doc.atv_status]), doc.atv_validation_date,
    t(doc.source === 'POS' ? 'historical.source.pos' : 'historical.source.history'),
  ])];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
