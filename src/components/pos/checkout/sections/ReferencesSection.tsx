import { useId } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { useAllReferences, useAllReferenceCodes } from '@/hooks/useDataApi';
import type { GetAllReferencesParams, GetAllReferenceCodesParams } from '@/services/data-api';
import {
  CountryISO,
  MAX_REFERENCES,
  REFERENCE_CODE_DOC_TYPES,
  REFERENCE_TYPE_DOC_TYPES,
  ReferenceActionCode,
  ReferenceDocType,
} from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import type { SaleReference } from '@/types/reference';
import { Select } from '@/components/ui';
import { CatalogFeedback } from '../fields/CatalogFeedback';

interface ReferencesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  references: SaleReference[];
  onChange: (refs: SaleReference[]) => void;
  /**
   * Hacienda document type being issued.
   *
   * Needed because a reference code legal in the catalog is not legal on every
   * document — code 17 is REP-only, code 06 and type 09 are NC/ND-only, type 16
   * is FEC-only. The dropdowns filter on it so an illegal combination cannot be
   * picked, rather than being caught by the backend after a consecutive has
   * already been allocated.
   */
  documentType?: string;
  /** Whether this document must carry at least one reference. */
  required?: boolean;
}

/**
 * Whether a reference code / document type may appear on `documentType`.
 *
 * Mirrors `CODES_BY_DOCUMENT_TYPE` / `TYPES_BY_DOCUMENT_TYPE` in sales-be. An
 * entry with no restriction is allowed everywhere.
 */
function allowedOn(
  restrictions: Readonly<Record<string, readonly string[]>>,
  value: string,
  documentType: string | undefined,
): boolean {
  const allowed = restrictions[value];
  if (!allowed) return true;
  return !!documentType && allowed.includes(documentType);
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
  documentType,
  required = false,
}: ReferencesSectionProps) {
  const { t } = useLanguage();
  const id = useId();
  const typesQuery = useAllReferences({ iso_code: CountryISO.COSTA_RICA } as GetAllReferencesParams);
  const codesQuery = useAllReferenceCodes({ iso_code: CountryISO.COSTA_RICA } as GetAllReferenceCodesParams);

  // Only the codes and types this document may actually carry.
  const typeOptions = (typesQuery.data ?? []).filter((rt: any) =>
    allowedOn(REFERENCE_TYPE_DOC_TYPES, String(rt.code ?? ''), documentType),
  );
  const codeOptions = (codesQuery.data ?? []).filter((rc: any) =>
    allowedOn(REFERENCE_CODE_DOC_TYPES, String(rc.code ?? ''), documentType),
  );

  const atMax = references.length >= MAX_REFERENCES;
  const add = () => {
    if (atMax) return;
    onChange([...references, { ...BLANK_REF }]);
  };
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
      <p className="t-xs text-muted-foreground mb-3">
        {required
          ? t('checkout.references.requiredHint')
          : t('checkout.references.optionalHint')}
      </p>

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
              type="button"
              onClick={() => remove(i)}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              {t('common.delete')}
            </button>
          </div>

          <div className="space-y-3">
            <div className="min-w-0 space-y-1">
              <label htmlFor={`${id}-${i}-type`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.type')}
              </label>
              <Select
                id={`${id}-${i}-type`}
                disabled={typesQuery.isLoading}
                value={ref.type}
                onChange={(e) => update(i, { type: e.target.value })}
                className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              >
                {typeOptions.map((rt: any) => (
                  <option key={rt.code ?? rt.id} value={rt.code ?? String(rt.id).padStart(2, '0')}>
                    {rt.description}
                  </option>
                ))}
              </Select>
              <CatalogFeedback isLoading={typesQuery.isLoading} isError={typesQuery.isError} isEmpty={typesQuery.data?.length === 0} onRetry={() => { void typesQuery.refetch(); }} />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor={`${id}-${i}-code`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.code')}
              </label>
              <Select
                id={`${id}-${i}-code`}
                disabled={codesQuery.isLoading}
                value={ref.code}
                onChange={(e) => update(i, { code: e.target.value })}
                className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              >
                {codeOptions.map((rc: any) => (
                  <option key={rc.code ?? rc.id} value={rc.code ?? String(rc.id).padStart(2, '0')}>
                    {rc.description}
                  </option>
                ))}
              </Select>
              <CatalogFeedback isLoading={codesQuery.isLoading} isError={codesQuery.isError} isEmpty={codesQuery.data?.length === 0} onRetry={() => { void codesQuery.refetch(); }} />
            </div>
          </div>

          {/* `TipoDocRefOTRO` / `CodigoReferenciaOTRO` — mandatory when the
              respective selector is 99, and captured by no field until now, so
              picking "Otros" produced a document the backend refuses. */}
          {(ref.type === ReferenceDocType.OTHER || ref.code === ReferenceActionCode.OTHER) && (
            <div className="grid grid-cols-2 gap-2">
              {ref.type === ReferenceDocType.OTHER && (
                <div className="min-w-0 space-y-1">
                  <label htmlFor={`${id}-${i}-other_type`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('checkout.references.otherType')}
                  </label>
                  <input
                    id={`${id}-${i}-other_type`}
                    value={ref.other_type ?? ''}
                    onChange={(e) => update(i, { other_type: e.target.value })}
                    className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
                    placeholder={t('checkout.references.otherTypePlaceholder')}
                  />
                </div>
              )}
              {ref.code === ReferenceActionCode.OTHER && (
                <div className="min-w-0 space-y-1">
                  <label htmlFor={`${id}-${i}-other_code`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('checkout.references.otherCode')}
                  </label>
                  <input
                    id={`${id}-${i}-other_code`}
                    value={ref.other_code ?? ''}
                    onChange={(e) => update(i, { other_code: e.target.value })}
                    className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
                    placeholder={t('checkout.references.otherCodePlaceholder')}
                  />
                </div>
              )}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <label htmlFor={`${id}-${i}-number`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('checkout.references.documentNumber')}
            </label>
            <input
              id={`${id}-${i}-number`}
              value={ref.number}
              onChange={(e) => update(i, { number: e.target.value })}
              className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              placeholder="50601…"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor={`${id}-${i}-reason`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.reason')} *
              </label>
              <input
                id={`${id}-${i}-reason`}
                value={ref.reason || ''}
                onChange={(e) => update(i, { reason: e.target.value })}
                maxLength={180}
                className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
                placeholder={t('checkout.references.reasonPlaceholder')}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor={`${id}-${i}-date`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.references.date')}
              </label>
              <input
                id={`${id}-${i}-date`}
                type="date"
                value={ref.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        disabled={atMax}
        title={atMax ? t('checkout.references.maxReached', { max: MAX_REFERENCES }) : undefined}
        className="min-w-0 w-full min-h-11 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('checkout.references.add')}
      </button>
    </SectionWrapper>
  );
}
