import { PaymentMethodCode, type PaymentMethodCodeValue } from "@/lib/enums/hacienda";

/** Every Hacienda payment code (Nota 6), in the order a till lists them. */
export const PAYMENT_METHOD_CODES: readonly PaymentMethodCodeValue[] = [
  PaymentMethodCode.CASH,
  PaymentMethodCode.SINPE_MOVIL,
  PaymentMethodCode.CARD,
  PaymentMethodCode.BANK_TRANSFER,
  PaymentMethodCode.CHEQUE,
  PaymentMethodCode.THIRD_PARTY_COLLECT,
  PaymentMethodCode.DIGITAL_PLATFORM,
  PaymentMethodCode.OTHER,
];

/** Hacienda payment code → curated Icon name (see src/components/ui/Icon.tsx). */
export const PAYMENT_METHOD_ICON: Record<string, string> = {
  "01": "cash",
  "02": "card",
  "03": "fileText",
  "04": "upload",
  "05": "users",
  "06": "smartphone",
  "07": "grid",
  "99": "layers",
};

/** Hacienda payment code → translation key. */
export const PAYMENT_METHOD_LABEL_KEY: Record<string, string> = {
  "01": "checkout.payment.method.cash",
  "02": "checkout.payment.method.card",
  "03": "checkout.payment.method.cheque",
  "04": "checkout.payment.method.transfer",
  "05": "checkout.payment.method.thirdParty",
  "06": "checkout.payment.method.sinpe",
  "07": "checkout.payment.method.digitalPlatform",
  "99": "checkout.payment.method.other",
};
