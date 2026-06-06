import { useState } from "react";
import { Icon, Card, Button, Input, FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethod = "Efectivo" | "SINPE" | "Tarjeta";

interface PaymentScreenProps {
  total: number;
  onBack: () => void;
  onConfirm: (method: PaymentMethod, received?: number) => Promise<void>;
}

const fmt = (n: number) => "₡" + n.toLocaleString("es-CR");

export default function PaymentScreen({ total, onBack, onConfirm }: PaymentScreenProps) {
  const { t } = useLanguage();
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [received, setReceived] = useState("");
  const [loading, setLoading] = useState(false);

  const METHODS: { id: PaymentMethod; icon: string; label: string }[] = [
    { id: "Efectivo", icon: "cash", label: t("pos.cash") },
    { id: "SINPE", icon: "smartphone", label: t("pos.sinpe") },
    { id: "Tarjeta", icon: "card", label: t("pos.card") },
  ];

  const receivedNum = Number(received);
  const change = receivedNum - total;
  const canConfirm = method !== "Efectivo" || (received !== "" && receivedNum >= total);

  const handleConfirm = async () => {
    if (!canConfirm || loading) return;
    setLoading(true);
    try {
      await onConfirm(method, method === "Efectivo" ? receivedNum : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon="arrowLeft" onClick={onBack} />
        <h2 className="t-h2 !m-0">{t("payment.title")}</h2>
      </div>

      {/* Total card */}
      <Card className="px-6 py-5 text-center">
        <div className="t-label mb-2 tracking-[0.08em]">{t("payment.totalLabel")}</div>
        <div className="t-stat-xl !text-5xl !text-primary">{fmt(total)}</div>
      </Card>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={`flex flex-col items-center gap-2 px-2 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              method === id
                ? "border-primary bg-primary/[0.08]"
                : "border-border bg-transparent"
            }`}
          >
            <div
              className={`icon-pill w-9 h-9 ${
                method === id
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon name={icon} size={16} />
            </div>
            <span
              className={`text-[13px] font-bold font-display ${
                method === id ? "text-primary" : "text-foreground"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Efectivo */}
      {method === "Efectivo" && (
        <div className="flex flex-col gap-2.5">
          <FormLabel>{t("payment.receivedLabel")}</FormLabel>
          <Input
            type="number"
            placeholder="₡0"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            inputSize="lg"
            className={`!font-display !font-extrabold !text-3xl !text-center ${
              received
                ? receivedNum >= total
                  ? "!border-success"
                  : "!border-destructive"
                : ""
            }`}
          />

          {/* Quick amount chips */}
          <div className="flex gap-1.5 flex-wrap">
            {[1000, 2000, 5000, 10000, 20000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setReceived(String(amt))}
                className="btn btn-outline btn-xs font-mono"
              >
                ₡{amt.toLocaleString("es-CR")}
              </button>
            ))}
          </div>

          {/* Change card */}
          {received && receivedNum >= total && (
            <Card className="px-[18px] py-3.5 flex justify-between items-center bg-success/[0.08] !border-success/30">
              <div className="flex items-center gap-2">
                <Icon name="cash" size={16} className="text-success" />
                <span className="text-sm font-bold text-success">{t("payment.return")}</span>
              </div>
              <span className="t-stat !text-[22px] !text-success">{fmt(change)}</span>
            </Card>
          )}

          {received && receivedNum < total && (
            <div className="flex items-center gap-2 text-destructive">
              <Icon name="alertTri" size={14} />
              <span className="t-sm font-semibold">
                {t("payment.remaining", { amount: fmt(total - receivedNum) })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* SINPE */}
      {method === "SINPE" && (
        <Card className="p-6 text-center">
          <div className="t-label mb-2.5 tracking-[0.06em]">{t("payment.sinpeTitle")}</div>
          <div className="t-num text-4xl font-extrabold text-primary tracking-[0.08em] mb-3">
            {import.meta.env.VITE_SINPE_NUMBER || "8888-8888"}
          </div>
          <p className="t-sm text-muted-foreground">
            {t("payment.sinpeInstruction", { amount: fmt(total) })}
          </p>
        </Card>
      )}

      {/* Tarjeta */}
      {method === "Tarjeta" && (
        <Card className="px-6 py-8 text-center">
          <div className="icon-pill w-16 h-16 mx-auto mb-4 bg-primary/10 text-primary">
            <Icon name="card" size={28} />
          </div>
          <div className="text-[17px] font-bold font-display mb-1.5">
            {t("payment.cardInstruction")}
          </div>
          <p className="t-sm text-muted-foreground">
            {t("payment.amountLabel")} <strong className="text-primary">{fmt(total)}</strong>
          </p>
        </Card>
      )}

      {/* Confirm button */}
      <Button
        variant="primary"
        size="xl"
        onClick={handleConfirm}
        disabled={!canConfirm || loading}
        icon={loading ? undefined : "checkCircle"}
        className="w-full mt-auto"
      >
        {loading
          ? t("payment.registering")
          : t("payment.confirm", { method: METHODS.find((m) => m.id === method)?.label ?? method })}
      </Button>
    </div>
  );
}
