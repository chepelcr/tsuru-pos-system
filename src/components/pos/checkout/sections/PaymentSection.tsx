import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentCurrencyOptional } from '@/contexts/DocumentCurrencyContext';
import { useAllPayments } from '@/hooks/useDataApi';
import { CountryISO } from '@/lib/enums';
import { Icon } from '@/components/ui';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import type { GetAllPaymentsParams, PaymentResponse } from '@/services/data-api';
import type { SalePayment } from '@/types/invoice';

const OTHER_PAYMENT_CODE = '99';

interface PaymentMethodOption {
  /** Hacienda payment type code (string). */
  code: string;
  label: string;
  icon: string;
}

// Hacienda payment code → curated Icon name (see src/components/ui/Icon.tsx).
const ICON_BY_CODE: Record<string, string> = {
  '01': 'cash',        // Efectivo
  '02': 'card',        // Tarjeta
  '03': 'fileText',    // Cheque
  '04': 'upload',      // Transferencia / depósito bancario
  '05': 'users',       // Recaudado por terceros
  '06': 'smartphone',  // SINPE Móvil
  '07': 'grid',        // Plataforma Digital
  '99': 'layers',      // Otros
};

// Hacienda payment code → translation key. Falls back to API `description` when missing.
const LABEL_KEY_BY_CODE: Record<string, string> = {
  '01': 'checkout.payment.method.cash',
  '02': 'checkout.payment.method.card',
  '03': 'checkout.payment.method.cheque',
  '04': 'checkout.payment.method.transfer',
  '05': 'checkout.payment.method.thirdParty',
  '06': 'checkout.payment.method.sinpe',
  '07': 'checkout.payment.method.digitalPlatform',
  '99': 'checkout.payment.method.other',
};

// Primary visible methods (in slot order). Others live behind the overflow dropdown.
const PRIMARY_CODES = ['01', '06', '02'] as const;
const FALLBACK_CODES = ['01', '02', '06', '99'] as const;

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000];

interface PaymentSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  cartTotal: number;
  payments: SalePayment[];
  onChange: (payments: SalePayment[]) => void;
}

export function PaymentSection({
  isExpanded,
  onToggle,
  cartTotal,
  payments,
  onChange,
}: PaymentSectionProps) {
  const { t } = useLanguage();
  const { fmtConverted: fmt } = useDocumentCurrencyOptional();
  const [cashInput, setCashInput] = useState<Record<string, string>>({});
  const [visibleCodes, setVisibleCodes] = useState<string[]>([...PRIMARY_CODES]);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const { data: apiPayments } = useAllPayments({
    iso_code: CountryISO.COSTA_RICA,
  } as GetAllPaymentsParams);

  const toOption = (code: string, fallbackLabel?: string): PaymentMethodOption => {
    const labelKey = LABEL_KEY_BY_CODE[code];
    const translated = labelKey ? t(labelKey) : undefined;
    const label =
      translated && translated !== labelKey ? translated : (fallbackLabel ?? code);
    return { code, label, icon: ICON_BY_CODE[code] ?? 'cash' };
  };

  const allMethods: PaymentMethodOption[] =
    apiPayments && apiPayments.length > 0
      ? apiPayments.map((p: PaymentResponse) => toOption(p.code, p.description))
      : FALLBACK_CODES.map((c) => toOption(c));

  const methodByCode = new Map(allMethods.map((m) => [m.code, m]));

  const visibleMethods = visibleCodes
    .map((c) => methodByCode.get(c))
    .filter((m): m is PaymentMethodOption => !!m);

  const overflowMethods = allMethods.filter((m) => !visibleCodes.includes(m.code));

  const isActive = (code: string) => payments.some((p) => p.type === code);

  // Number of active payments currently hidden behind the overflow dropdown.
  const hiddenActiveCount = overflowMethods.filter((m) => isActive(m.code)).length;

  // Reflow: if there's an active payment hidden in the dropdown AND an inactive
  // visible slot, surface the hidden one into the LAST inactive slot.
  useEffect(() => {
    if (hiddenActiveCount === 0) return;
    const lastInactiveIdx = visibleCodes
      .map((c, i) => (isActive(c) ? -1 : i))
      .filter((i) => i >= 0)
      .pop();
    if (lastInactiveIdx === undefined) return;
    const hiddenActiveCode = overflowMethods.find((m) => isActive(m.code))?.code;
    if (!hiddenActiveCode) return;
    const next = [...visibleCodes];
    next[lastInactiveIdx] = hiddenActiveCode;
    setVisibleCodes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenActiveCount, payments.length, visibleCodes.join('|')]);

  // Close overflow dropdown on outside click (covers the portaled menu too).
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = overflowRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // Position the portaled menu against the trigger's viewport rect.
  useLayoutEffect(() => {
    if (!overflowOpen) { setMenuPos(null); return; }
    const updatePos = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width * 2 + 8, 220);
      const left = Math.min(r.right - width, window.innerWidth - width - 8);
      setMenuPos({ top: r.bottom + 6, left: Math.max(8, left), width });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [overflowOpen, overflowMethods.length]);

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, cartTotal - paid);
  const change = Math.max(0, paid - cartTotal);
  const isBalanced = paid >= cartTotal;

  const setAmount = (code: string, raw: string) => {
    setCashInput((prev) => ({ ...prev, [code]: raw }));
    const amount = parseFloat(raw) || 0;
    const next = payments.filter((p) => p.type !== code);
    if (amount > 0) {
      const prev = payments.find((p) => p.type === code);
      next.push({ type: code, amount, other_type: prev?.other_type });
    }
    onChange(next);
  };

  const setOtherType = (code: string, value: string) => {
    const next = payments.map((p) =>
      p.type === code ? { ...p, other_type: value } : p
    );
    onChange(next);
  };

  const activatePayment = (code: string) => {
    const leftover = Math.max(0, cartTotal - paid);
    onChange([...payments, { type: code, amount: leftover }]);
    setCashInput((prev) => ({ ...prev, [code]: String(leftover) }));
  };

  const deactivatePayment = (code: string) => {
    onChange(payments.filter((p) => p.type !== code));
    setCashInput((prev) => { const n = { ...prev }; delete n[code]; return n; });
  };

  const toggleVisible = (code: string) => {
    if (isActive(code)) deactivatePayment(code);
    else activatePayment(code);
  };

  /**
   * Pick a method from the overflow dropdown.
   * - If any visible slot is currently inactive → replace the LAST inactive slot.
   * - Else if 3 visible slots and all active → shift: v[0] stays, v[2]→slot2, X→slot3.
   * - Else → append X as a new slot.
   */
  const pickFromOverflow = (code: string) => {
    setOverflowOpen(false);

    if (visibleCodes.includes(code)) {
      if (!isActive(code)) activatePayment(code);
      return;
    }

    const lastInactiveIdx = visibleCodes
      .map((c, i) => (isActive(c) ? -1 : i))
      .filter((i) => i >= 0)
      .pop();

    if (lastInactiveIdx !== undefined) {
      const nextVisible = [...visibleCodes];
      nextVisible[lastInactiveIdx] = code;
      setVisibleCodes(nextVisible);
      activatePayment(code);
      return;
    }

    if (visibleCodes.length === 3) {
      setVisibleCodes([visibleCodes[0], visibleCodes[2], code]);
      activatePayment(code);
      return;
    }

    setVisibleCodes([...visibleCodes, code]);
    activatePayment(code);
  };

  const exact = () => {
    const cashEntry = payments.find((p) => p.type === '01');
    if (!cashEntry) {
      onChange([{ type: '01', amount: cartTotal }]);
      setCashInput({ '01': String(cartTotal) });
    }
  };

  const badge = paid > 0 ? fmt(paid) : undefined;

  // For amount inputs we render every active payment, ordered: visible slots first, then any hidden actives.
  const activeOptions: PaymentMethodOption[] = [
    ...visibleMethods.filter((m) => isActive(m.code)),
    ...allMethods.filter((m) => isActive(m.code) && !visibleCodes.includes(m.code)),
  ];

  const tileClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-1 h-16 rounded-md border text-[11px] font-semibold transition-colors px-1 text-center',
      active
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
    );

  return (
    <SectionWrapper
      title={t('checkout.tab.payment')}
      icon={Wallet}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={badge}
    >
      {/* Total display */}
      <div className="px-1 py-3 bg-muted/40 rounded-lg text-center">
        <div className="text-[10px] uppercase tracking-wider font-display font-bold text-muted-foreground">
          {t('checkout.payment.totalToCharge')}
        </div>
        <div className="font-display font-extrabold text-[38px] leading-none mt-1 t-num text-primary">
          {fmt(cartTotal)}
        </div>
        {paid > 0 && (
          <div className="mt-1 text-[12px] text-muted-foreground">
            {t('checkout.payment.paid', { amount: fmt(paid) })}
            {remaining > 0
              ? t('checkout.payment.remaining', { amount: fmt(remaining) })
              : t('checkout.payment.changeInline', { amount: fmt(change) })}
          </div>
        )}
      </div>

      {/* Payment methods */}
      <div className="space-y-2">
        <div className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          {t('checkout.payment.method')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {visibleMethods.map(({ code, label, icon }) => {
            const active = isActive(code);
            return (
              <button
                key={code}
                onClick={() => toggleVisible(code)}
                className={tileClass(active)}
              >
                <Icon name={icon} size={20} />
                <span className="truncate w-full">{label}</span>
              </button>
            );
          })}

          {overflowMethods.length > 0 && (
            <div ref={overflowRef} className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setOverflowOpen((v) => !v)}
                className={cn(
                  tileClass(false),
                  'w-full',
                  overflowOpen && 'border-primary/60 text-primary'
                )}
              >
                <Icon name="more" size={20} />
                <span className="truncate w-full">{t('checkout.payment.more')}</span>
              </button>
              {hiddenActiveCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-sm pointer-events-none"
                  aria-label={t('checkout.payment.hiddenCount', { n: hiddenActiveCount })}
                >
                  {hiddenActiveCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {overflowOpen && menuPos && overflowMethods.length > 0 &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="dropdown-menu p-2 grid grid-cols-2 gap-2 fade-up"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 300,
            }}
          >
            {overflowMethods.map(({ code, label, icon }) => {
              const active = isActive(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => pickFromOverflow(code)}
                  className={tileClass(active)}
                >
                  <Icon name={icon} size={20} />
                  <span className="truncate w-full">{label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {/* Amount inputs per active method — 2 per row. */}
      {activeOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {activeOptions.map(({ code, label }) => {
            const isOther = code === OTHER_PAYMENT_CODE;
            const isCash = code === '01';
            const otherTypeValue =
              payments.find((p) => p.type === code)?.other_type ?? '';
            const fullRow = isCash || isOther;
            return (
              <div
                key={code}
                className={cn('space-y-1', fullRow && 'col-span-2')}
              >
                <div className="text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
                  {t('checkout.payment.amountFor', { method: label })}
                </div>
                {isCash && (
                  <div className="grid grid-cols-5 gap-1.5 mb-1">
                    <button
                      onClick={exact}
                      className="h-8 rounded-md border border-border bg-card text-[11px] font-mono t-num hover:border-primary/40"
                    >
                      {t('checkout.payment.exact')}
                    </button>
                    {QUICK_AMOUNTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount('01', String(Math.max(cartTotal, v < cartTotal ? cartTotal : v)))}
                        className="h-8 rounded-md border border-border bg-card text-[11px] font-mono t-num hover:border-primary/40"
                      >
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                )}
                {isOther ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={cashInput[code] ?? payments.find((p) => p.type === code)?.amount ?? ''}
                      onChange={(e) => setAmount(code, e.target.value)}
                      className="w-full h-11 rounded-md border border-border bg-background px-3 text-[15px] font-mono t-num focus:outline-none focus:border-primary"
                      placeholder="0"
                    />
                    <input
                      type="text"
                      value={otherTypeValue}
                      onChange={(e) => setOtherType(code, e.target.value)}
                      className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                      placeholder={t('checkout.payment.otherTypePlaceholder')}
                      maxLength={100}
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    value={cashInput[code] ?? payments.find((p) => p.type === code)?.amount ?? ''}
                    onChange={(e) => setAmount(code, e.target.value)}
                    className="w-full h-11 rounded-md border border-border bg-background px-3 text-[15px] font-mono t-num focus:outline-none focus:border-primary"
                    placeholder="0"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {isBalanced && (
        <div className="p-3 rounded-md bg-success/8 border border-success/20 text-[12px] text-success text-center font-semibold">
          {change > 0
            ? t('checkout.payment.completeWithChange', { amount: fmt(change) })
            : t('checkout.payment.complete')}
        </div>
      )}
    </SectionWrapper>
  );
}
