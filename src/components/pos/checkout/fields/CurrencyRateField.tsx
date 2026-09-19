import { useEffect, useMemo } from 'react';
import { useAllCurrencies } from '@/hooks/useDataApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';
import { Select } from '@/components/ui';
import type { CurrencyCode } from '@/types/invoice';

/** Codes whose rate is supplied by the Hacienda endpoint (locked input). */
const AUTO_RATE_CODES = new Set(['CRC', 'USD', 'EUR']);
const PINNED_ORDER = ['CRC', 'USD', 'EUR'];

interface CurrencyRateFieldProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
}

/**
 * Currency + exchange rate. Deliberately ONE component, not two fields: the
 * auto-rate lock, the pinned sort order, the "rate unavailable" guard and the
 * effect that pulls a rate in once it arrives are a single coupled behaviour.
 * Splitting them would mean two components sharing one piece of state.
 *
 * Extracted from DocumentSection for the manual-order card (§2.1).
 */
export function CurrencyRateField({ value, onChange, disabled }: CurrencyRateFieldProps) {
  const { t, language } = useLanguage();
  const { data: currencies } = useAllCurrencies();
  const { getRateFor, isLoading: rateLoading, isError: rateError } = useExchangeRate();

  const currentCode = (value.currency_code || 'CRC').toUpperCase();
  const isAuto = AUTO_RATE_CODES.has(currentCode);

  // CRC, USD, EUR pinned first; the rest alphabetical by code.
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

  // USD/EUR are unselectable while the Hacienda rate is missing: a document
  // priced at a guessed rate is worse than one the cashier cannot start.
  const isCodeDisabled = (code: string): boolean => {
    if (code === 'CRC') return false;
    if (!AUTO_RATE_CODES.has(code)) return false;
    return rateLoading || rateError || getRateFor(code) == null;
  };

  // Pull the auto rate in when it lands after the currency was picked.
  useEffect(() => {
    if (!isAuto) return;
    const auto = getRateFor(currentCode);
    if (auto == null) return;
    if (value.exchange_rate !== auto) {
      onChange({ ...value, exchange_rate: auto });
    }
  }, [currentCode, isAuto, getRateFor, value, onChange]);

  const handleSelectChange = (next: string) => {
    const auto = getRateFor(next);
    onChange({
      currency_code: next,
      // Auto-rate codes lock to the fetched value; manual codes start blank.
      exchange_rate: auto ?? undefined,
    });
  };

  // Keep the current selection rendered while the catalog loads, instead of
  // snapping to the first option.
  const hasCurrentInList = sortedCurrencies.some((c) => c.code === currentCode);

  return (
    // One column on a narrow screen, two from `sm` up.
    //
    // It was `grid-cols-2` unconditionally, which halves a 520px drawer to ~250px
    // and then to ~120px per field inside the section padding. A currency option
    // reads "USD — Dólar estadounidense", and the select could not shrink to fit
    // it, so it overflowed its column — over the exchange-rate field beside it,
    // which is why the rate looked missing rather than merely cramped. Whether it
    // showed depended on the theme, because each one sets its own font and
    // radius: a wider face overflowed sooner. Stacking removes the dependence
    // instead of tuning per theme.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1 min-w-0">
        <label className="label-section" htmlFor="currency-code">
          {t('checkout.document.currency')}
        </label>
        <Select
          id="currency-code"
          value={currentCode}
          disabled={disabled}
          onChange={(e) => handleSelectChange(e.target.value)}
          // `min-w-0` so the select may shrink inside its grid column instead of
          // holding its content width and pushing out of it.
          className="pp-input w-full min-w-0"
        >
          {!hasCurrentInList && <option value={currentCode}>{currentCode}</option>}
          {sortedCurrencies.map((c) => {
            const isDisabled = isCodeDisabled(c.code);
            const name = language === 'es' ? c.currency_name_es : c.currency_name_en;
            const suffix = isDisabled
              ? ` (${t('checkout.document.currency.rateUnavailable')})`
              : '';
            return (
              <option key={c.code} value={c.code} disabled={isDisabled}>
                {c.code} — {name}
                {suffix}
              </option>
            );
          })}
        </Select>
      </div>
      <div className="space-y-1 min-w-0">
        <label className="label-section" htmlFor="exchange-rate">
          {t('checkout.document.exchangeRate')}
        </label>
        <input
          id="exchange-rate"
          type="number"
          value={value.exchange_rate ?? ''}
          onChange={(e) =>
            onChange({ ...value, exchange_rate: parseFloat(e.target.value) || 0 })
          }
          readOnly={isAuto}
          disabled={disabled || isAuto}
          placeholder={isAuto ? '' : t('checkout.document.exchangeRate.manualPlaceholder')}
          className="pp-input w-full font-mono disabled:opacity-60 disabled:cursor-not-allowed"
          min={0}
          step={0.01}
        />
      </div>
    </div>
  );
}
