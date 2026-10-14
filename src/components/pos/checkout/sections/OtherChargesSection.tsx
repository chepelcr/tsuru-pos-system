/**
 * Otros cargos (OtrosCargos, Nota 16) in the checkout — TSR-125.
 *
 * Codes come from the data-api catalog (`other-charges`, offline-persisted).
 * A charge is either a percentage of the lines' subtotal (06, the 10% service
 * tax) or a flat amount; 04 (third-party collection) captures the third party's
 * identification and name, 99 its free-text nature. Rules and amounts are
 * `lib/otherCharges`, which mirrors sales-be.
 */

import { useId } from 'react';
import { Receipt as ReceiptIcon } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { Select } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllOtherCharges } from '@/hooks/useDataApi';
import { CountryISO, OtherChargeCode } from '@/lib/enums';
import { useDocumentCurrencyOptional } from '@/contexts/DocumentCurrencyContext';
import { CatalogFeedback } from '../fields/CatalogFeedback';
import { MAX_OTHER_CHARGES, otherChargeAmount } from '@/lib/otherCharges';
import type { GetAllOtherChargesParams } from '@/services/data-api/dtos/other-charges';
import type { OtherCharge } from '@/types/invoice';

interface OtherChargesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  charges: OtherCharge[];
  onChange: (charges: OtherCharge[]) => void;
  /** Lines subtotal — the base of a percentage charge. */
  linesSubtotal: number;
  errors: string[];
}

const FIELD = 'min-w-0 w-full min-h-11 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:border-primary';
const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground';

const BLANK: OtherCharge = { type: OtherChargeCode.SERVICE_TAX_10, description: '', percentage: 10 };

export function OtherChargesSection({
  isExpanded,
  onToggle,
  charges,
  onChange,
  linesSubtotal,
  errors,
}: OtherChargesSectionProps) {
  const { t } = useLanguage();
  const id = useId();
  const { symbol, fmtConverted } = useDocumentCurrencyOptional();
  const { data: catalog, isLoading, isError, refetch } = useAllOtherCharges({ iso_code: CountryISO.COSTA_RICA } as GetAllOtherChargesParams);

  const atMax = charges.length >= MAX_OTHER_CHARGES;
  const add = () => { if (!atMax) onChange([...charges, { ...BLANK }]); };
  const remove = (i: number) => onChange(charges.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<OtherCharge>) =>
    onChange(charges.map((charge, idx) => (idx === i ? { ...charge, ...patch } : charge)));

  return (
    <SectionWrapper
      title={t('checkout.otherCharges.title')}
      icon={ReceiptIcon}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={charges.length || undefined}
    >
      <p className="t-xs text-muted-foreground mb-3">{t('checkout.otherCharges.hint')}</p>

      {charges.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">{t('checkout.otherCharges.empty')}</div>
      )}

      {charges.map((charge, i) => {
        const byPercent = charge.percentage != null;
        const amount = otherChargeAmount(charge, linesSubtotal);
        return (
          <div key={i} className="rounded-md border border-border p-3 space-y-3 bg-muted/20 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold">{t('checkout.otherCharges.chargeN', { n: i + 1 })}</span>
              <button type="button" onClick={() => remove(i)} className="text-[11px] text-muted-foreground hover:text-destructive">
                {t('common.delete')}
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor={`${id}-${i}-type`} className={LABEL}>{t('checkout.otherCharges.type')}</label>
              <Select id={`${id}-${i}-type`} disabled={isLoading} value={charge.type} onChange={(e) => update(i, { type: e.target.value })} className={FIELD}>
                {(catalog ?? []).map((row) => (
                  <option key={row.code} value={row.code}>{row.code} · {row.description}</option>
                ))}
              </Select>
              <CatalogFeedback isLoading={isLoading} isError={isError} isEmpty={catalog?.length === 0} onRetry={() => { void refetch(); }} />
            </div>

            {charge.type === OtherChargeCode.OTHER && (
              <div className="space-y-1">
                <label htmlFor={`${id}-${i}-otherType`} className={LABEL}>{t('checkout.otherCharges.otherType')}</label>
                <input
                  id={`${id}-${i}-otherType`}
                  value={charge.other_charge_type ?? ''}
                  maxLength={100}
                  onChange={(e) => update(i, { other_charge_type: e.target.value })}
                  className={FIELD}
                />
              </div>
            )}

            {charge.type === OtherChargeCode.THIRD_PARTY_COLLECTION && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor={`${id}-${i}-thirdPartyId`} className={LABEL}>{t('checkout.otherCharges.thirdPartyId')}</label>
                  <input
                    id={`${id}-${i}-thirdPartyId`}
                    value={charge.other_person?.identification?.number ?? ''}
                    inputMode="numeric"
                    maxLength={20}
                    onChange={(e) => {
                      const number = e.target.value.replace(/\D/g, '');
                      // Juridical ids are 10 digits; physical 9 — the type follows the number.
                      const code = number.length === 10 ? '02' : '01';
                      update(i, { other_person: { ...charge.other_person, identification: { code, number } } });
                    }}
                    className={FIELD}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`${id}-${i}-thirdPartyName`} className={LABEL}>{t('checkout.otherCharges.thirdPartyName')}</label>
                  <input
                    id={`${id}-${i}-thirdPartyName`}
                    value={charge.other_person?.name ?? ''}
                    maxLength={100}
                    onChange={(e) => update(i, { other_person: { ...charge.other_person, name: e.target.value } })}
                    className={FIELD}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor={`${id}-${i}-detail`} className={LABEL}>{t('checkout.otherCharges.detail')}</label>
              <input
                  id={`${id}-${i}-detail`}
                value={charge.description ?? ''}
                maxLength={160}
                onChange={(e) => update(i, { description: e.target.value })}
                className={FIELD}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${id}-${i}-value`} className={LABEL}>
                {t(byPercent ? 'checkout.otherCharges.percentage' : 'checkout.otherCharges.amount')}
              </label>
              <div className="flex min-w-0 min-h-11 overflow-hidden rounded-md border border-border bg-background focus-within:border-primary">
                <input
                  id={`${id}-${i}-value`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={byPercent ? 100 : undefined}
                  step={byPercent ? 'any' : '0.01'}
                  value={byPercent ? charge.percentage ?? '' : charge.amount ?? ''}
                  onChange={(e) => update(i, byPercent
                    ? { percentage: e.target.value === '' ? 0 : Number(e.target.value), amount: undefined }
                    : { amount: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="min-w-0 w-full flex-1 bg-transparent px-3 py-2 text-sm t-num outline-none"
                />
                <div role="group" aria-label={t('checkout.otherCharges.mode')} className="flex shrink-0 border-l border-border">
                  <button
                    type="button"
                    aria-label={t('checkout.otherCharges.byAmount')}
                    aria-pressed={!byPercent}
                    onClick={() => { if (byPercent) update(i, { percentage: undefined, amount }); }}
                    className={`min-w-11 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${!byPercent ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {symbol}
                  </button>
                  <button
                    type="button"
                    aria-label={t('checkout.otherCharges.byPercent')}
                    aria-pressed={byPercent}
                    onClick={() => {
                      if (!byPercent) update(i, {
                        percentage: linesSubtotal > 0 ? Number(((amount * 100) / linesSubtotal).toFixed(5)) : 0,
                        amount: undefined,
                      });
                    }}
                    className={`min-w-11 border-l border-border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${byPercent ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    %
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between t-sm">
              <span className="text-muted-foreground">{t('checkout.otherCharges.chargeTotal')}</span>
              <span className="font-semibold t-num">{fmtConverted(amount)}</span>
            </div>
          </div>
        );
      })}

      {errors.map((key) => (
        <p key={key} role="alert" className="t-xs text-destructive">{t(key)}</p>
      ))}

      <button type="button" onClick={add} disabled={atMax} className="btn btn-outline btn-sm w-full mt-1">
        {t('checkout.otherCharges.add')}
      </button>
    </SectionWrapper>
  );
}
