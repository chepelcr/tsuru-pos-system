import React, { createContext, useContext, useMemo } from 'react';
import { useAllCurrencies } from '@/hooks/useDataApi';
import type { CurrencyCode } from '@/types/invoice';

interface DocumentCurrencyContextType {
  /** Active document currency (code + exchange_rate). */
  currency: CurrencyCode;
  /** Resolved exchange rate (colones per 1 unit of `currency.currency_code`). */
  rate: number;
  /** Symbol from the currencies catalog, with hardcoded fallbacks. */
  symbol: string;
  /** Format an amount that is in CRC base — converts then formats. */
  fmt: (crcAmount: number) => string;
  /** Format an amount that is already in the document currency. */
  fmtConverted: (amount: number) => string;
}

const DocumentCurrencyContext = createContext<DocumentCurrencyContextType | undefined>(
  undefined
);

const HARDCODED_SYMBOLS: Record<string, string> = {
  CRC: '₡',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

interface DocumentCurrencyProviderProps {
  children: React.ReactNode;
  currency: CurrencyCode | undefined;
}

export function DocumentCurrencyProvider({
  children,
  currency,
}: DocumentCurrencyProviderProps) {
  const { data: currencies } = useAllCurrencies();

  const value = useMemo<DocumentCurrencyContextType>(() => {
    const code = (currency?.currency_code || 'CRC').toUpperCase();
    const rate =
      code === 'CRC'
        ? 1
        : currency?.exchange_rate && currency.exchange_rate > 0
        ? currency.exchange_rate
        : 1;

    const catalog = currencies?.find((c) => c.code === code);
    const symbol =
      catalog?.currency_symbol || HARDCODED_SYMBOLS[code] || code + ' ';

    const formatAmount = (n: number) =>
      Math.round(n).toLocaleString('es-CR');

    return {
      currency: currency ?? { currency_code: 'CRC', exchange_rate: 1 },
      rate,
      symbol,
      fmt: (crcAmount: number) => symbol + formatAmount(crcAmount / rate),
      fmtConverted: (amount: number) => symbol + formatAmount(amount),
    };
  }, [currency, currencies]);

  return (
    <DocumentCurrencyContext.Provider value={value}>
      {children}
    </DocumentCurrencyContext.Provider>
  );
}

export function useDocumentCurrency(): DocumentCurrencyContextType {
  const ctx = useContext(DocumentCurrencyContext);
  if (!ctx) {
    throw new Error(
      'useDocumentCurrency must be used within a DocumentCurrencyProvider'
    );
  }
  return ctx;
}

/** Safe variant for components rendered outside a checkout (defaults to CRC). */
export function useDocumentCurrencyOptional(): DocumentCurrencyContextType {
  const ctx = useContext(DocumentCurrencyContext);
  if (ctx) return ctx;
  // Default formatter — preserves the pre-existing ₡ behavior.
  return {
    currency: { currency_code: 'CRC', exchange_rate: 1 },
    rate: 1,
    symbol: '₡',
    fmt: (n: number) => '₡' + Math.round(n).toLocaleString('es-CR'),
    fmtConverted: (n: number) => '₡' + Math.round(n).toLocaleString('es-CR'),
  };
}
