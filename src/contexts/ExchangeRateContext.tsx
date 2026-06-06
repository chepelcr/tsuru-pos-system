import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { useExchangeRates } from '@/hooks/useDataApi';

interface CachedRates {
  /** YYYY-MM-DD from Hacienda response (or local today when missing) */
  date: string;
  dollarSell: number | null;
  euroValue: number | null;
}

interface ExchangeRateContextType {
  /** Colones per 1 USD (sell). */
  dollarRate: number | null;
  /** Colones per 1 EUR. */
  euroRate: number | null;
  /**
   * Returns the colones-per-unit rate for a known code, or `null` when the
   * code is custom and the user has to type the rate manually.
   *   CRC → 1
   *   USD → dollar.sell
   *   EUR → euro.colones
   *   *   → null
   */
  getRateFor: (currencyCode: string) => number | null;
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(
  undefined
);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheKey(orgId: string): string {
  return `exchangeRate:${orgId}`;
}

function readCache(orgId: string): CachedRates | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (!parsed?.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(orgId: string, value: CachedRates): void {
  try {
    sessionStorage.setItem(cacheKey(orgId), JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable (private mode, quota) — non-fatal.
  }
}

interface ExchangeRateProviderProps {
  children: React.ReactNode;
  orgId: string;
  isoCode: string;
}

export function ExchangeRateProvider({
  children,
  orgId,
  isoCode,
}: ExchangeRateProviderProps) {
  // Read sessionStorage once per orgId. Cache is valid only when its `date`
  // matches today (handles "if stored rate's date is not today → refetch").
  const cached = useMemo(() => readCache(orgId), [orgId]);
  const cacheValid = !!cached && cached.date === todayISO();

  const { data, isLoading, isError, refetch } = useExchangeRates(
    { iso_code: isoCode },
    {
      enabled: !cacheValid && !!orgId && !!isoCode,
      staleTime: Infinity,
    }
  );

  useEffect(() => {
    if (!data || !orgId) return;
    const rateDate = data.dollar?.sell?.date ?? data.euro?.date ?? todayISO();
    writeCache(orgId, {
      date: rateDate.slice(0, 10),
      dollarSell: data.dollar?.sell?.value ?? null,
      euroValue: data.euro?.colones ?? null,
    });
  }, [data, orgId]);

  const dollarRate = cacheValid
    ? cached!.dollarSell
    : data?.dollar?.sell?.value ?? null;
  const euroRate = cacheValid
    ? cached!.euroValue
    : data?.euro?.colones ?? null;

  const getRateFor = useCallback(
    (code: string): number | null => {
      const c = code?.toUpperCase();
      if (c === 'CRC') return 1;
      if (c === 'USD') return dollarRate;
      if (c === 'EUR') return euroRate;
      return null;
    },
    [dollarRate, euroRate]
  );

  const value = useMemo<ExchangeRateContextType>(
    () => ({
      dollarRate,
      euroRate,
      getRateFor,
      isLoading: !cacheValid && isLoading,
      isError: !cacheValid && isError,
      refresh: () => {
        try {
          sessionStorage.removeItem(cacheKey(orgId));
        } catch {
          // ignore
        }
        refetch();
      },
    }),
    [dollarRate, euroRate, getRateFor, cacheValid, isLoading, isError, orgId, refetch]
  );

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate(): ExchangeRateContextType {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) {
    throw new Error(
      'useExchangeRate must be used within an ExchangeRateProvider'
    );
  }
  return ctx;
}
