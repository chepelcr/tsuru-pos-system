import { Link as LinkIcon } from 'lucide-react';
import { useAllReferences, useAllReferenceCodes } from '@/hooks/useDataApi';
import type { GetAllReferencesParams, GetAllReferenceCodesParams } from '@/services/data-api';
import { CountryISO } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import type { SaleReference } from '@/types/reference';

interface ReferencesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  references: SaleReference[];
  onChange: (refs: SaleReference[]) => void;
}

const BLANK_REF: SaleReference = {
  type: '01',
  number: '',
  date: new Date().toISOString().slice(0, 10),
  code: '01',
  reason: '',
};

export function ReferencesSection({
  isExpanded,
  onToggle,
  references,
  onChange,
}: ReferencesSectionProps) {
  const { t } = useLanguage();
  const { data: referenceTypes } = useAllReferences({ iso_code: CountryISO.COSTA_RICA } as GetAllReferencesParams);
  const { data: referenceCodes } = useAllReferenceCodes({ iso_code: CountryISO.COSTA_RICA } as GetAllReferenceCodesParams);

  const add = () => onChange([...references, { ...BLANK_REF }]);
  const remove = (i: number) => onChange(references.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<SaleReference>) =>
    onChange(references.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <SectionWrapper
      title={t('checkout.tab.references')}
      icon={LinkIcon}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={references.length || undefined}
    >
      {references.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {t('checkout.references.empty')}
        </div>
      )}

      {references.map((ref, i) => (
        <div key={i} className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold">{t('checkout.references.referenceN', { n: i + 1 })}</span>
            <button
              onClick={() => remove(i)}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              {t('common.delete')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.type')}
              </label>
              <select
                value={ref.type}
                onChange={(e) => update(i, { type: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              >
                {(referenceTypes ?? []).map((rt: any) => (
                  <option key={rt.code ?? rt.id} value={rt.code ?? String(rt.id).padStart(2, '0')}>
                    {rt.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.code')}
              </label>
              <select
                value={ref.code}
                onChange={(e) => update(i, { code: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              >
                {(referenceCodes ?? []).map((rc: any) => (
                  <option key={rc.code ?? rc.id} value={rc.code ?? String(rc.id).padStart(2, '0')}>
                    {rc.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.documentNumber')}
              </label>
              <input
                value={ref.number}
                onChange={(e) => update(i, { number: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
                placeholder="50601…"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.date')}
              </label>
              <input
                type="date"
                value={ref.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('checkout.references.reason')}
            </label>
            <input
              value={ref.reason || ''}
              onChange={(e) => update(i, { reason: e.target.value })}
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              placeholder={t('checkout.references.reasonPlaceholder')}
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full h-9 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {t('checkout.references.add')}
      </button>
    </SectionWrapper>
  );
}
