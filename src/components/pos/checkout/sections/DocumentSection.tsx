import { useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useAllCurrencies, useAllSaleConditions } from '@/hooks/useDataApi';
import type { GetAllSaleConditionsParams } from '@/services/data-api';
import { CountryISO } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';
import { useOrgContext } from '@/contexts/OrgContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import type { CurrencyCode } from '@/types/invoice';

interface DocumentSectionData {
  /** Hacienda sale condition code. */
  sale_condition: string;
  activity_code: string;
  /** Document-level currency. */
  currency: CurrencyCode;
  notes: string;
}

interface DocumentSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  data: DocumentSectionData;
  onChange: (patch: Partial<DocumentSectionData>) => void;
}

/** Codes whose rate is supplied by the Hacienda endpoint (locked input). */
const AUTO_RATE_CODES = new Set(['CRC', 'USD', 'EUR']);
const PINNED_ORDER = ['CRC', 'USD', 'EUR'];

export function DocumentSection({
  isExpanded,
  onToggle,
  data,
  onChange,
}: DocumentSectionProps) {
  const { t, language } = useLanguage();
  const { data: saleConditions } = useAllSaleConditions({
    iso_code: CountryISO.COSTA_RICA,
  } as GetAllSaleConditionsParams);
  const { data: currencies } = useAllCurrencies();
  const { getRateFor, isLoading: rateLoading, isError: rateError } = useExchangeRate();
  const { registeredOrg } = useOrgContext();

  // Org's registered Hacienda economic activities — drives the activity_code
  // select. Filter to active ('A') so revoked codes don't pollute the picker.
  const activities = useMemo(
    () => (registeredOrg?.activities ?? []).filter((a) => a.status === 'A'),
    [registeredOrg],
  );

  // Auto-pick the first active activity when the field is empty. Mirrors the
  // currency auto-rate effect below — fills in once the org data arrives.
  useEffect(() => {
    if (data.activity_code) return;
    if (activities.length === 0) return;
    onChange({ activity_code: activities[0].code });
  }, [activities, data.activity_code, onChange]);

  const currentCode = (data.currency.currency_code || 'CRC').toUpperCase();
  const isAuto = AUTO_RATE_CODES.has(currentCode);

  // Sort currencies: CRC, USD, EUR pinned first; rest alphabetical by code.
  const sortedCurrencies = useMemo(() => {
    const list = currencies ?? [];
    return [...list].sort((a, b) => {
      const ai = PINNED_ORDER.indexOf(a.code);
      const bi = PINNED_ORDER.indexOf(b.code);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }
      return a.code.localeCompare(b.code);
    });
  }, [currencies]);

  // Whether an auto-rate code can be selected right now. USD/EUR are blocked
  // when the Hacienda rate is still loading or failed to load.
  const isCodeDisabled = (code: string): boolean => {
    if (code === 'CRC') return false;
    if (!AUTO_RATE_CODES.has(code)) return false;
    return rateLoading || rateError || getRateFor(code) == null;
  };

  // Keep auto-rate in sync with the selected currency. When the rate arrives
  // after the user selected USD/EUR this pulls it in; for CRC it pins to 1.
  useEffect(() => {
    if (!isAuto) return;
    const auto = getRateFor(currentCode);
    if (auto == null) return;
    if (data.currency.exchange_rate !== auto) {
      onChange({ currency: { ...data.currency, exchange_rate: auto } });
    }
  }, [currentCode, isAuto, getRateFor, data.currency, onChange]);

  const handleSelectChange = (next: string) => {
    const auto = getRateFor(next);
    onChange({
      currency: {
        currency_code: next,
        // Auto-rate codes lock to the fetched value; manual codes start blank.
        exchange_rate: auto ?? undefined,
      },
    });
  };

  // Fallback option for the case where the catalog hasn't loaded yet — keeps
  // the current selection rendered instead of resetting to the first option.
  const hasCurrentInList = sortedCurrencies.some((c) => c.code === currentCode);

  return (
    <SectionWrapper
      title={t('checkout.tab.document')}
      icon={FileText}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {/* Sale condition (Hacienda code string) */}
      <div className="space-y-1">
        <label className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          {t('checkout.document.saleCondition')}
        </label>
        <select
          value={data.sale_condition}
          onChange={(e) => onChange({ sale_condition: e.target.value })}
          className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
        >
          {(saleConditions ?? []).map((sc: any) => (
            <option key={sc.code ?? sc.id} value={sc.code ?? String(sc.id).padStart(2, '0')}>
              {sc.description}
            </option>
          ))}
        </select>
      </div>

      {/* Activity code — sourced from the org's registered Hacienda activities */}
      <div className="space-y-1">
        <label className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          {t('checkout.document.activityCode')}
        </label>
        {activities.length > 0 ? (
          <select
            value={data.activity_code}
            onChange={(e) => onChange({ activity_code: e.target.value })}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
          >
            {!activities.some((a) => a.code === data.activity_code) && data.activity_code && (
              <option value={data.activity_code}>{data.activity_code}</option>
            )}
            {activities.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code}{a.description ? ` — ${a.description}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <select
            disabled
            className="w-full h-10 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground"
          >
            <option>{t('checkout.document.activityCode.notConfigured')}</option>
          </select>
        )}
      </div>

      {/* Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
            {t('checkout.document.currency')}
          </label>
          <select
            value={currentCode}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
          >
            {!hasCurrentInList && (
              <option value={currentCode}>{currentCode}</option>
            )}
            {sortedCurrencies.map((c) => {
              const disabled = isCodeDisabled(c.code);
              const name = language === 'es' ? c.currency_name_es : c.currency_name_en;
              const suffix = disabled ? ` (${t('checkout.document.currency.rateUnavailable')})` : '';
              return (
                <option key={c.code} value={c.code} disabled={disabled}>
                  {c.code} — {name}{suffix}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
            {t('checkout.document.exchangeRate')}
          </label>
          <input
            type="number"
            value={data.currency.exchange_rate ?? ''}
            onChange={(e) =>
              onChange({
                currency: {
                  ...data.currency,
                  exchange_rate: parseFloat(e.target.value) || 0,
                },
              })
            }
            readOnly={isAuto}
            disabled={isAuto}
            placeholder={isAuto ? '' : t('checkout.document.exchangeRate.manualPlaceholder')}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          {t('checkout.document.notes')}
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
          placeholder={t('checkout.document.notesPlaceholder')}
        />
      </div>
    </SectionWrapper>
  );
}
