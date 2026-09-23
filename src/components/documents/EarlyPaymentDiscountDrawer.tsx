/**
 * "Aplicar descuento por pronto pago" (TSR-340).
 *
 * Asks for the discount amount WITH IVA and the IVA rate (only the rates the
 * original carries), shows how the IVA comes out of it, and emits a financial
 * credit note (NC, reference code 09) against the accepted invoice with the
 * original's configuration. The original's XML figures never change; its
 * final amount drops once Hacienda validates the note.
 */

import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button, Drawer, MoneyInput, SelectField, type SelectFieldOption } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFinancialCreditNote } from '@/hooks/useFinancialCreditNote';
import { useAllTaxRates } from '@/hooks/useDataApi';
import { CountryISO } from '@/lib/enums/countries';
import { formatMoney, roundMoney } from '@/lib/money';
import { ivaRatesOnDocument, remainingBalance, splitDiscount } from '@/lib/earlyPaymentDiscount';
import { documentDetailPath } from '@/routePaths';
import type { GetAllTaxRatesParams } from '@/services/data-api/dtos/taxes';
import type { SaleDocument } from '@/types/invoice';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  original: SaleDocument;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={strong ? 't-body font-semibold' : 't-sm text-muted-foreground'}>{label}</span>
      <span className={strong ? 't-stat' : 't-body font-semibold t-num'}>{value}</span>
    </div>
  );
}

export function EarlyPaymentDiscountDrawer({ open, onClose, orgId, original }: Props) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const rates = useMemo(() => ivaRatesOnDocument(original), [original]);
  const balance = remainingBalance(original);
  const [amountRaw, setAmountRaw] = useState('');
  const [rateCode, setRateCode] = useState(rates[0]?.rate_code ?? '');
  const [reason, setReason] = useState(t('documents.earlyPayment.defaultReason'));
  const emit = useFinancialCreditNote(orgId, original);
  const { data: taxRates } = useAllTaxRates({ iso_code: CountryISO.COSTA_RICA } as GetAllTaxRatesParams);

  const amount = roundMoney(Number(amountRaw) || 0);
  const rate = rates.find((r) => r.rate_code === rateCode);
  const split = rate && amount > 0 ? splitDiscount(amount, rate.rate) : null;
  const overBalance = amount > balance;
  const canSubmit = !!split && split.total > 0 && !overBalance && !!reason.trim() && !emit.isPending;

  const rateOptions: SelectFieldOption[] = rates.map((r) => {
    const catalog = (taxRates ?? []).find((row) => row.code === r.rate_code);
    return { value: r.rate_code, label: catalog?.description ?? `${r.rate}%`, hint: `${r.rate}%` };
  });

  const submit = async () => {
    if (!split || !rate) return;
    const note = await emit.mutateAsync({ amount, rate_code: rate.rate_code, reason: reason.trim() });
    onClose();
    if (note.sale_id) navigate(documentDetailPath(note.sale_id));
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closeLabel={t('common.close')}
      title={t('documents.earlyPayment.title')}
      subtitle={t('documents.earlyPayment.subtitle', { number: original.consecutive_number ?? '' })}
      icon="dollar"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!canSubmit}>
            {emit.isPending ? t('documents.earlyPayment.emitting') : t('documents.earlyPayment.emit')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="card-surface-muted p-4">
          <Row label={t('documents.balance.original')} value={formatMoney(original.summary?.voucher_total ?? 0)} />
          {!!original.credited_total && (
            <Row label={t('documents.balance.credited')} value={`-${formatMoney(original.credited_total)}`} />
          )}
          <Row label={t('documents.balance.available')} value={formatMoney(balance)} strong />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="pp-label" htmlFor="early-payment-amount">{t('documents.earlyPayment.amount')}</label>
          <MoneyInput id="early-payment-amount" value={amountRaw} onChange={setAmountRaw} />
          <p className="t-xs text-muted-foreground">{t('documents.earlyPayment.amountHint')}</p>
          {overBalance && <p className="t-xs text-destructive">{t('documents.earlyPayment.overBalance')}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="pp-label" htmlFor="early-payment-rate">{t('documents.earlyPayment.rate')}</label>
          <SelectField id="early-payment-rate" value={rateCode} onChange={setRateCode} options={rateOptions} />
          <p className="t-xs text-muted-foreground">{t('documents.earlyPayment.rateHint')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="pp-label" htmlFor="early-payment-reason">{t('documents.earlyPayment.reason')}</label>
          <input
            id="early-payment-reason"
            className="pp-input"
            maxLength={180}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {split && (
          <div className="card p-4">
            <div className="label-section mb-2">{t('documents.earlyPayment.breakdown')}</div>
            <Row label={t('documents.earlyPayment.net')} value={formatMoney(split.net)} />
            <Row label={t('documents.earlyPayment.iva')} value={formatMoney(split.iva)} />
            <Row label={t('documents.earlyPayment.noteTotal')} value={formatMoney(split.total)} strong />
            <Row label={t('documents.balance.finalAfter')} value={formatMoney(roundMoney(balance - split.total))} />
          </div>
        )}

        {emit.isError && (
          <p role="alert" className="t-sm text-destructive">{emit.error instanceof Error ? emit.error.message : t('common.error')}</p>
        )}
      </div>
    </Drawer>
  );
}
