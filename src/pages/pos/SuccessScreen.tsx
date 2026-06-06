import { Icon, Card, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethod = "Efectivo" | "SINPE" | "Tarjeta";

interface SuccessScreenProps {
  total: number;
  paymentMethod: PaymentMethod;
  change?: number;
  onNewSale: () => void;
}

const fmt = (n: number) => "₡" + n.toLocaleString("es-CR");

const METHOD_ICON: Record<PaymentMethod, string> = {
  Efectivo: "cash",
  SINPE: "smartphone",
  Tarjeta: "card",
};

export default function SuccessScreen({ total, paymentMethod, change, onNewSale }: SuccessScreenProps) {
  const { t } = useLanguage();

  return (
    <div className="fade-up flex-1 flex flex-col items-center justify-center gap-5 p-8">
      {/* Success icon-pill */}
      <div className="icon-pill w-[72px] h-[72px] bg-success/[0.12] text-success border-2 border-success/40">
        <Icon name="checkCircle" size={32} />
      </div>

      {/* Title */}
      <div className="text-center">
        <div className="t-h2 !text-success mb-1.5">{t("success.title")}</div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Icon name={METHOD_ICON[paymentMethod]} size={14} />
          <span className="t-sm">
            {paymentMethod} · {fmt(total)}
          </span>
        </div>
      </div>

      {/* Change card */}
      {paymentMethod === "Efectivo" && change !== undefined && change >= 0 && (
        <Card className="px-7 py-5 text-center bg-success/[0.08] !border-success/30 w-full max-w-[280px]">
          <div className="t-label mb-2 tracking-[0.06em]">{t("success.returnClient")}</div>
          <div className="t-stat-xl !text-[40px] !text-success">{fmt(change)}</div>
        </Card>
      )}

      {/* Sync note */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon name="refresh" size={12} />
        <span className="t-xs font-mono">{t("success.syncPending")}</span>
      </div>

      {/* New sale button */}
      <Button
        variant="primary"
        size="xl"
        icon="arrowLeft"
        onClick={onNewSale}
        className="w-full"
      >
        {t("success.newSale")}
      </Button>
    </div>
  );
}
