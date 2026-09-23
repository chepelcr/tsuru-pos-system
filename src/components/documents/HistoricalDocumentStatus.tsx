import { Badge } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ATV_STATUS, FOREIGN_ENVIRONMENT_STATUS } from '@/lib/documentStatus';
import type { HistoricalDocument } from '@/types/historicalDocument';

/** Same status map as every other document surface (lib/documentStatus). */
export function HistoricalDocumentStatus({
  status,
  foreignEnvironment = false,
}: {
  status: HistoricalDocument['atv_status'];
  foreignEnvironment?: boolean;
}) {
  const { t } = useLanguage();
  const view = foreignEnvironment ? FOREIGN_ENVIRONMENT_STATUS : ATV_STATUS[status];
  return <Badge variant={view?.variant ?? 'secondary'}>{t(view?.labelKey ?? 'historical.status.unknown')}</Badge>;
}
