import { useState } from "react";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/store/inventory";
import type { Product } from "@/types";
import { Icon, Card, Badge, Button } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import { useLanguage } from "@/contexts/LanguageContext";

const fmt = (n: number) => "₡" + Math.round(n).toLocaleString("es-CR");
const fmtTime = (d: number) => new Date(d).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });

interface ClosingFlowProps {
  assignmentId: string;
  sessionId: string;
  expectedCash: number;
  expectedSinpe: number;
  expectedCard: number;
  onClose: () => void;
}

const DENOMS = [
  { key: "b20000", value: 20000, labelKey: "closing.bill20k" },
  { key: "b10000", value: 10000, labelKey: "closing.bill10k" },
  { key: "b5000", value: 5000, labelKey: "closing.bill5k" },
  { key: "b2000", value: 2000, labelKey: "closing.bill2k" },
  { key: "b1000", value: 1000, labelKey: "closing.bill1k" },
  { key: "c500", value: 500, labelKey: "closing.coin500" },
  { key: "c100", value: 100, labelKey: "closing.coin100" },
] as const;

type DenomKey = typeof DENOMS[number]["key"];

export default function ClosingFlow({
  assignmentId,
  sessionId,
  expectedCash,
  onClose,
}: ClosingFlowProps) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { data: rawProducts } = useProducts();
  const { t } = useLanguage();
  const products: Product[] = Array.isArray(rawProducts)
    ? rawProducts
    : (rawProducts as any)?.data ?? [];
  const inventory = useInventory();

  const [step, setStep] = useState(1);
  const [finalCounts, setFinalCounts] = useState<Record<string, string>>({});
  const [cashCount, setCashCount] = useState<Record<DenomKey, string>>({
    b20000: "", b10000: "", b5000: "", b2000: "", b1000: "", c500: "", c100: "",
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const activeProducts = products.filter((p) => p.status === 1);
  const filledCount = Object.values(finalCounts).filter((v) => v !== "").length;

  const cashTotal = DENOMS.reduce(
    (s, d) => s + (Number(cashCount[d.key]) || 0) * d.value,
    0,
  );
  const cashDiff = cashTotal - expectedCash;

  const getExpected = (p: Product) => inventory.getStock(p.product_id) ?? 0;

  const faltantes = activeProducts.filter((p) => {
    const actual = Number(finalCounts[p.product_id]) || 0;
    const exp = getExpected(p);
    return finalCounts[p.product_id] !== "" && actual < exp;
  });

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await crossAppApi.post(crossAppOrgPath(org!.id, "/closings"), {
        session_id: sessionId,
        assignment_id: assignmentId,
        declared_cash: cashTotal,
        declared_sinpe: 0,
        declared_card: 0,
        declared_total: cashTotal,
        notes: notes || undefined,
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-[440px] mx-auto min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background gap-5">
        <div className="icon-pill icon-pill-lg w-[72px] h-[72px] bg-success/15 text-success">
          <Icon name="checkCircle" size={32} />
        </div>
        <h2 className="t-h2">{t("closing.closeSent")}</h2>
        <p className="t-body text-muted-foreground">{t("closing.managerWillReview")}</p>
        <Button variant="primary" size="xl" onClick={onClose} className="w-full">
          {t("common.close")}
        </Button>
      </div>
    );
  }

  const stepLabels = [t("closing.stepInventory"), t("closing.stepCash"), t("closing.stepSummary")];

  return (
    <div className="max-w-[440px] mx-auto min-h-screen flex flex-col bg-background">
      {/* Nav bar */}
      <div className="nav-bar px-4 py-2.5 flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={onClose}
          aria-label={t("closing.back")}
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <div className="flex-1">
          <div className="t-label text-[10px]">{t("closing.title")}</div>
          <div className="text-sm font-bold">
            {t("closing.step", { n: String(step), total: "3" })}
          </div>
        </div>
        <Badge variant="warning">
          <Icon name="lock" size={10} /> {t("closing.closingLabel")}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3.5">
        <div className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex-1 h-1 rounded-sm transition-colors duration-300 ${
                n <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={`t-xs ${
                i + 1 >= step ? "text-foreground" : "text-muted-foreground"
              } ${i + 1 === step ? "font-bold" : "font-medium"}`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3.5 pb-[100px] overflow-y-auto">
        {/* Step 1: Inventory count */}
        {step === 1 && (
          <>
            <Card className="p-3.5 mb-3.5 bg-info/[0.08] !border-info/30">
              <div className="flex gap-2.5">
                <Icon
                  name="info"
                  size={18}
                  className="text-info flex-shrink-0 mt-px"
                />
                <div>
                  <div className="text-[13px] font-bold mb-0.5 text-info">
                    {t("closing.countRemaining")}
                  </div>
                  <div className="t-xs text-muted-foreground">
                    {t("closing.systemCompares")}
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex flex-col gap-2">
              {activeProducts.map((p) => {
                const val = finalCounts[p.product_id] ?? "";
                const actual = Number(val) || 0;
                const exp = getExpected(p);
                const diff = actual - exp;
                const hasValue = val !== "" && val !== null;
                const isMatch = hasValue && diff === 0;
                const isMissing = hasValue && diff < 0;
                const borderClass = isMatch
                  ? "!border-success/40"
                  : isMissing
                  ? "!border-destructive/40"
                  : "";
                return (
                  <Card
                    key={p.product_id}
                    className={`p-3 transition-colors ${borderClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <ProductImage imageUrl={p.image_url} name={p.name} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{p.name}</div>
                        <div className="t-xs text-muted-foreground">
                          {t("closing.expectedRemaining")}{" "}
                          <strong className="t-num text-foreground">{exp}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <input
                          className="t-num w-[60px] text-center text-lg font-extrabold bg-muted border-0 outline-none rounded-lg py-2 font-display"
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setFinalCounts((c) => ({ ...c, [p.product_id]: e.target.value }))
                          }
                          placeholder="0"
                        />
                        {hasValue && (
                          <div
                            className={`t-xs t-num font-bold mt-0.5 ${
                              diff === 0
                                ? "text-success"
                                : diff > 0
                                ? "text-warning"
                                : "text-destructive"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2: Cash breakdown */}
        {step === 2 && (
          <>
            <Card className="p-4 mb-3.5">
              <div className="t-label mb-1.5">{t("closing.totalExpected")}</div>
              <div className="t-stat-xl !text-4xl">{fmt(expectedCash)}</div>
              <div className="t-xs text-muted-foreground mt-1">
                {t("closing.initialFundSales")}
              </div>
            </Card>

            <div className="t-label mb-2.5">{t("closing.cashBreakdown")}</div>
            <Card className="p-3">
              {DENOMS.map((denom, i) => {
                const qty = Number(cashCount[denom.key]) || 0;
                return (
                  <div
                    key={denom.key}
                    className={`flex items-center gap-2.5 py-2.5 ${
                      i < DENOMS.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold">{t(denom.labelKey)}</div>
                      <div className="t-xs t-num text-muted-foreground">
                        × {fmt(denom.value)}
                      </div>
                    </div>
                    <input
                      className="pp-input t-num w-[70px] text-center font-bold font-display"
                      type="number"
                      value={cashCount[denom.key]}
                      onChange={(e) =>
                        setCashCount((c) => ({ ...c, [denom.key]: e.target.value }))
                      }
                      placeholder="0"
                    />
                    <div className="t-num w-[86px] text-right text-[13px] font-bold text-muted-foreground">
                      {qty * denom.value > 0 ? fmt(qty * denom.value) : "—"}
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card
              className={`p-3.5 mt-3.5 ${
                cashDiff === 0
                  ? "bg-success/[0.08] !border-success/30"
                  : Math.abs(cashDiff) < 1000
                  ? "bg-warning/[0.08] !border-warning/30"
                  : "bg-destructive/[0.08] !border-destructive/30"
              }`}
            >
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="text-muted-foreground">{t("closing.counted")}</span>
                <span className="t-num font-bold">{fmt(cashTotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] mb-2.5">
                <span className="text-muted-foreground">{t("closing.expected")}</span>
                <span className="t-num font-bold">{fmt(expectedCash)}</span>
              </div>
              <div className="separator mb-2.5" />
              <div className="flex justify-between items-center">
                <span className="t-label">
                  {cashDiff > 0
                    ? t("closing.surplus")
                    : cashDiff < 0
                    ? t("closing.shortage")
                    : t("closing.difference")}
                </span>
                <span
                  className={`t-stat !text-2xl ${
                    cashDiff === 0
                      ? "text-success"
                      : Math.abs(cashDiff) < 1000
                      ? "text-warning"
                      : "text-destructive"
                  }`}
                >
                  {cashDiff >= 0 ? "+" : "−"}
                  {fmt(Math.abs(cashDiff))}
                </span>
              </div>
            </Card>
          </>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <>
            <Card className="p-[18px] mb-3.5 !border-primary/30 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02]">
              <div className="t-label !text-primary mb-1.5">
                {t("closing.shiftStation")}
              </div>
              <div className="t-h3 mb-1">{t("closing.finalSummary")}</div>
              <div className="t-xs text-muted-foreground">
                {user?.name ?? t("closing.cashier")} · 19:00 → {fmtTime(Date.now())}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <Card className="p-3.5">
                <div className="t-label">{t("closing.sales")}</div>
                <div className="t-stat !text-[22px] text-success">—</div>
                <div className="t-xs text-muted-foreground">
                  {t("closing.shiftOrders")}
                </div>
              </Card>
              <Card className="p-3.5">
                <div className="t-label">{t("closing.cashLabel")}</div>
                <div className="t-stat !text-[22px]">{fmt(cashTotal)}</div>
                <div
                  className={`t-xs t-num ${
                    cashDiff >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {cashDiff >= 0 ? "+" : "−"}
                  {fmt(Math.abs(cashDiff))}
                </div>
              </Card>
            </div>

            <Card className="p-4 mb-3.5">
              <div className="t-label mb-2.5">{t("closing.productShortages")}</div>
              {faltantes.length === 0 ? (
                <div className="flex items-center gap-2.5 py-2">
                  <Icon name="checkCircle" size={18} className="text-success" />
                  <span className="t-sm font-semibold">{t("closing.allBalanced")}</span>
                </div>
              ) : (
                faltantes.map((p) => {
                  const exp = getExpected(p);
                  const actual = Number(finalCounts[p.product_id]) || 0;
                  return (
                    <div
                      key={p.product_id}
                      className="flex items-center gap-2.5 py-2 border-b border-border"
                    >
                      <ProductImage
                        imageUrl={p.image_url}
                        name={p.name}
                        size={18}
                        className="rounded-sm"
                      />
                      <span className="flex-1 text-[13px] font-semibold">{p.name}</span>
                      <Badge variant="destructive">−{exp - actual}</Badge>
                    </div>
                  );
                })
              )}
            </Card>

            <Card className="p-3.5">
              <div className="t-label mb-2">{t("closing.notes")}</div>
              <textarea
                className="pp-input min-h-[70px]"
                placeholder={t("closing.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Card>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-overlay bg-background/90 backdrop-blur-md border-t border-border px-4 pt-3 pb-5">
        <div className="max-w-[440px] mx-auto flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep((s) => s - 1)}
              className="flex-[0.8]"
            >
              <Icon name="arrowLeft" size={16} /> {t("closing.back")}
            </Button>
          )}
          {step < 3 ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && filledCount < activeProducts.length}
              className="flex-1"
            >
              {t("closing.continue")} <Icon name="arrowRight" size={16} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              <Icon name="check" size={16} />{" "}
              {loading ? t("closing.sending") : t("closing.closeShift")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
