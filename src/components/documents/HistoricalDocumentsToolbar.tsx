import { useLanguage } from '@/contexts/LanguageContext';
import { DocumentTypesFilter } from './DocumentTypesFilter';
import { HISTORICAL_STATUS_KEYS } from '@/lib/historicalDocuments';
import type { HistoricalDocumentFilters } from '@/types/historicalDocument';

interface Props {
  filters: HistoricalDocumentFilters;
  onChange: (filters: HistoricalDocumentFilters) => void;
}

export function HistoricalDocumentsToolbar({ filters, onChange }: Props) {
  const { t } = useLanguage();
  const patch = (change: Partial<HistoricalDocumentFilters>) => onChange({ ...filters, ...change });
  return (
    <div className="card p-4 mb-5 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-48">
          <span className="pp-label">{t('common.search')}</span>
          <input className="pp-input w-full" type="search" value={filters.search_term ?? ''}
            placeholder={t('historical.searchPlaceholder')} onChange={(event) => patch({ search_term: event.target.value })} />
        </label>
        <div className="min-w-48"><DocumentTypesFilter selectedTypes={filters.document_types ?? []} onChange={(document_types) => patch({ document_types })} /></div>
        <button className="btn btn-outline btn-sm" onClick={() => onChange({})}>{t('common.clear')}</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {(['branch_number', 'terminal_number'] as const).map((key) => (
          <label key={key}>
            <span className="pp-label">{t(key === 'branch_number' ? 'historical.branch' : 'historical.terminal')}</span>
            <input type="number" min={1} max={key === 'branch_number' ? 999 : 99999} step={1}
              className="pp-input w-full" value={filters[key] ?? ''} placeholder={t('common.all')}
              onChange={(event) => {
                const value = event.target.value;
                if (!value || event.target.validity.valid) patch({ [key]: value ? Number(value) : undefined });
              }} />
          </label>
        ))}
        <label>
          <span className="pp-label">{t('historical.atvStatus')}</span>
          <select className="pp-input w-full" value={filters.atv_status ?? ''} onChange={(event) => patch({ atv_status: event.target.value === '' ? undefined : Number(event.target.value) as 0 | 1 | 2 | 3 })}>
            <option value="">{t('common.all')}</option>
            {([0, 1, 2, 3] as const).map((status) => <option key={status} value={status}>{t(HISTORICAL_STATUS_KEYS[status])}</option>)}
          </select>
        </label>
        <label>
          <span className="pp-label">{t('historical.startDate')}</span>
          <input type="date" className="pp-input w-full" value={filters.start_date ?? ''} max={filters.end_date || undefined} onChange={(event) => patch({ start_date: event.target.value })} />
        </label>
        <label>
          <span className="pp-label">{t('historical.endDate')}</span>
          <input type="date" className="pp-input w-full" value={filters.end_date ?? ''} min={filters.start_date || undefined} onChange={(event) => patch({ end_date: event.target.value })} />
        </label>
        <label>
          <span className="pp-label">{t('historical.sort')}</span>
          <select className="pp-input w-full" value={filters.sort_direction ?? 'desc'} onChange={(event) => patch({ sort_direction: event.target.value as 'asc' | 'desc' })}>
            <option value="desc">{t('documents.sort.dateDesc')}</option>
            <option value="asc">{t('documents.sort.dateAsc')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
