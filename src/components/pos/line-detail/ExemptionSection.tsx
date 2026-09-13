import { useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel, Select } from '@/components/ui';
import { useAllExemptions, useAllExemptionIssuingInstitutions } from '@/hooks/useDataApi';
import {
  CountryISO,
  ExemptionCode,
  LOCAL_EXEMPTION_CODES,
  NC_ND_ONLY_EXEMPTION_CODES,
  TaxTypeCode,
} from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { exoneratedAmount } from '@/services/taxCalculationService';
import type { Exemption, LineTax } from '@/types/lineDetail';

/**
 * The v4.4 `Exoneracion` block, edited on the line's IVA tax.
 *
 * It hangs off a TAX, not off the line — the XML puts `Exoneracion` inside each
 * `Impuesto`, and the arithmetic is `MontoExonerado = MontoImpuesto × TarifaExonerada / 100`
 * — so it needs an IVA row to attach to. A Nota 10.1 authorization forgives VAT,
 * not the specific consumption excises, which is why it is bound to the IVA
 * family (01/07/08) rather than offered per tax row.
 *
 * `MontoExonerado` is shown but never edited: it is an output the backend derives,
 * and sales-be rejects an exonerated amount larger than the tax it exonerates.
 */
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

interface ExemptionSectionProps {
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  /** The computed IVA for this line — the base the exonerated amount comes off. */
  ivaTaxTotal: number;
  /** Hacienda document type being issued, for the NC/ND-only codes. */
  documentType?: string;
  isExpanded: boolean;
  onToggle: () => void;
  /** Bubbles validation up so the drawer can block save. */
  onValidationChange?: (errors: string[]) => void;
}

const BLANK_EXEMPTION: Exemption = {
  type: ExemptionCode.FREE_TRADE_ZONE,
  number: '',
  percentage: 100,
};

export function ExemptionSection({
  taxes,
  onChange,
  ivaTaxTotal,
  documentType,
  isExpanded,
  onToggle,
  onValidationChange,
}: ExemptionSectionProps) {
  const { t } = useLanguage();
  const { data: exemptionTypes } = useAllExemptions({ iso_code: CountryISO.COSTA_RICA } as never);
  const { data: institutions } = useAllExemptionIssuingInstitutions({
    iso_code: CountryISO.COSTA_RICA,
  } as never);

  const ivaIndex = taxes.findIndex((tax) => IVA_CODES.includes(tax.code ?? ''));
  const ivaTax = ivaIndex >= 0 ? taxes[ivaIndex] : undefined;
  const exemption = ivaTax?.exemption;

  const setExemption = (next: Exemption | undefined) => {
    if (ivaIndex < 0) return;
    onChange(
      taxes.map((tax, i) =>
        i === ivaIndex ? { ...tax, exemption: next } : tax,
      ),
    );
  };

  const update = (patch: Partial<Exemption>) =>
    setExemption({ ...(exemption ?? BLANK_EXEMPTION), ...patch });

  // Validation mirrors sales-be's `ExonerationValidator`, which reports these
  // under different field names than the DTO (`document_type`, `document_number`,
  // `exonerated_percentage`) — worth knowing when matching up a backend error.
  const errors = useMemo(() => {
    if (!exemption) return [];
    const found: string[] = [];
    if (!exemption.type?.trim()) found.push(t('lineDetail.exemption.typeRequired'));
    if (exemption.type === ExemptionCode.OTHER && !exemption.other_type?.trim()) {
      found.push(t('lineDetail.exemption.otherTypeRequired'));
    }
    if (!exemption.number?.trim()) found.push(t('lineDetail.exemption.numberRequired'));
    const pct = Number(exemption.percentage ?? 0);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      found.push(t('lineDetail.exemption.percentageRange'));
    }
    return found;
  }, [exemption, t]);

  // Reported through an effect, like the sibling sections: calling the parent's
  // setter during render is a setState-in-render.
  useEffect(() => {
    onValidationChange?.(errors);
  }, [errors, onValidationChange]);

  const isLocal = LOCAL_EXEMPTION_CODES.includes(exemption?.type ?? '');
  const isNcNdOnly = NC_ND_ONLY_EXEMPTION_CODES.includes(exemption?.type ?? '');
  const wrongDocument =
    isNcNdOnly && !!documentType && !['02', '03'].includes(documentType);

  const exonerated = exoneratedAmount(exemption, ivaTaxTotal);

  return (
    <SectionWrapper
      title={t('lineDetail.exemption.title')}
      icon={ShieldCheck}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={exemption ? 1 : undefined}
    >
      {ivaIndex < 0 ? (
        <p className="t-xs text-muted-foreground">{t('lineDetail.exemption.needsIva')}</p>
      ) : !exemption ? (
        <button
          onClick={() => setExemption({ ...BLANK_EXEMPTION })}
          className="w-full h-9 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {t('lineDetail.exemption.add')}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.type')}</FormLabel>
              <Select
                value={exemption.type ?? ''}
                onChange={(e) => update({ type: e.target.value })}
                className="pp-input pp-input-sm w-full"
              >
                {(exemptionTypes ?? []).map((ex: any) => (
                  <option key={ex.code ?? ex.id} value={ex.code ?? ''}>
                    {ex.code} — {ex.description}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.percentage')}</FormLabel>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={exemption.percentage ?? ''}
                onChange={(e) =>
                  update({
                    percentage: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="pp-input pp-input-sm w-full"
              />
            </div>
          </div>

          {exemption.type === ExemptionCode.OTHER && (
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.otherType')}</FormLabel>
              <input
                value={exemption.other_type ?? ''}
                onChange={(e) => update({ other_type: e.target.value })}
                placeholder={t('lineDetail.exemption.otherTypePlaceholder')}
                className="pp-input pp-input-sm w-full"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.number')}</FormLabel>
              <input
                value={exemption.number ?? ''}
                onChange={(e) => update({ number: e.target.value })}
                className="pp-input pp-input-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.issueDate')}</FormLabel>
              <input
                type="date"
                value={(exemption.issue_date ?? '').slice(0, 10)}
                onChange={(e) => update({ issue_date: e.target.value })}
                className="pp-input pp-input-sm w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <FormLabel>{t('lineDetail.exemption.institution')}</FormLabel>
            <Select
              value={exemption.institution?.code ?? ''}
              onChange={(e) => {
                const picked = (institutions ?? []).find(
                  (inst: any) => String(inst.code) === e.target.value,
                ) as any;
                update({
                  institution: picked
                    ? { code: String(picked.code), name: picked.description }
                    : undefined,
                });
              }}
              className="pp-input pp-input-sm w-full"
            >
              <option value="">—</option>
              {(institutions ?? []).map((inst: any) => (
                <option key={inst.code ?? inst.id} value={inst.code ?? ''}>
                  {inst.description}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.article')}</FormLabel>
              <input
                value={exemption.article ?? ''}
                onChange={(e) => update({ article: e.target.value })}
                className="pp-input pp-input-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <FormLabel>{t('lineDetail.exemption.section')}</FormLabel>
              <input
                value={exemption.section ?? ''}
                onChange={(e) => update({ section: e.target.value })}
                className="pp-input pp-input-sm w-full"
              />
            </div>
          </div>

          <div className="card-muted p-2.5">
            <div className="flex items-baseline justify-between">
              <span className="t-label">{t('lineDetail.exemption.amountLabel')}</span>
              <span className="t-num font-semibold">{exonerated.toFixed(2)}</span>
            </div>
            <p className="t-xs text-muted-foreground mt-1">
              {t('lineDetail.exemption.amountHint')}
            </p>
          </div>

          {isLocal && (
            <p className="t-xs text-info">{t('lineDetail.exemption.localWarning')}</p>
          )}
          {wrongDocument && (
            <p className="t-xs text-warning">{t('lineDetail.exemption.ncndWarning')}</p>
          )}
          {errors.length > 0 && (
            <div className="flex flex-col gap-1">
              {errors.map((msg, i) => (
                <span key={i} className="t-xs text-destructive">
                  {msg}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setExemption(undefined)}
            className="t-xs text-muted-foreground hover:text-destructive"
          >
            {t('lineDetail.exemption.remove')}
          </button>
        </div>
      )}
    </SectionWrapper>
  );
}
