import { Badge } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { HISTORICAL_STATUS_KEYS } from '@/lib/historicalDocuments';
import type { HistoricalDocument } from '@/types/historicalDocument';

const VARIANTS = { 0: 'info', 1: 'success', 2: 'warning', 3: 'destructive' } as const;

export function HistoricalDocumentStatus({ status }: { status: HistoricalDocument['atv_status'] }) {
  const { t } = useLanguage();
  return <Badge variant={VARIANTS[status] ?? 'secondary'}>{t(HISTORICAL_STATUS_KEYS[status] ?? 'historical.status.unknown')}</Badge>;
}
