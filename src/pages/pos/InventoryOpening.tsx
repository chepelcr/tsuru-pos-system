import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, orgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { db } from "@/lib/db";
import { useInventory } from "@/store/inventory";
import type { Product } from "@/types";
import { Icon, Card, Button, SyncPill, Modal } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import { useLanguage } from "@/contexts/LanguageContext";

const fmt = (n: number) => "₡" + Math.round(n).toLocaleString("es-CR");

interface InventoryOpeningProps {
  products: Product[];
  assignmentId: string;
  onDone: () => void;
  puestoName?: string;
  sessionName?: string;
  sessionTime?: string;
  onExit?: () => void;
}

export default function InventoryOpening({
  products,
  assignmentId,
  onDone,
  puestoName = "Puesto",
  sessionName = "Sesión activa",
  sessionTime,
  onExit,
}: InventoryOpeningProps) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const setOpeningStock = useInventory((s) => s.setOpeningStock);
  const { t } = useLanguage();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [cash, setCash] = useState("25000");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeProducts = products.filter((p) => p.status === 1);
  const filledCount = activeProducts.filter((p) => counts[p.product_id] !== "" && counts[p.product_id] !== undefined).length;
  const totalProducts = activeProducts.length;
  const progress = totalProducts > 0 ? (filledCount / totalProducts) * 100 : 0;
  const allDone = filledCount === totalProducts && totalProducts > 0 && cash !== "";
  const totalValue = activeProducts.reduce(
    (s, p) => s + (Number(counts[p.product_id]) || 0) * p.price,
    0,
  );

  const adjustCount = (id: string, delta: number) => {
    setCounts((c) => ({ ...c, [id]: String(Math.max(0, (Number(c[id]) || 0) + delta)) }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = activeProducts.map((p) => ({
        productId: p.product_id,
        quantity: Number(counts[p.product_id]) || 0,
      }));

      for (const item of items) {
        setOpeningStock(item.productId, item.quantity);
        await db.inventory.put({
          productId: parseInt(item.productId, 10),
          assignmentId,
          openingStock: item.quantity,
          currentStock: item.quantity,
        });
      }

      await api.post(orgPath(user!.userId, org!.id, "/inventory/opening"), {
        assignmentId,
        items,
        initialCash: Number(cash) || 0,
      });
    },
    onSuccess: () => {
      setConfirmOpen(false);
      onDone();
    },
  });

  return (
    <div className="max-w-[440px] mx-auto min-h-screen flex flex-col bg-background">
      {/* Nav bar */}
      <div className="nav-bar px-4 py-2.5 flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={onExit}
          aria-label={t("inv.back")}
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <div className="flex-1">
          <div className="t-label !text-[10px]">{t("inv.shiftOpening")}</div>
          <div className="text-sm font-bold">{t("inv.initialCount")}</div>
        </div>
        <SyncPill state="online" />
      </div>

      {/* Context card */}
      <div className="px-4 pt-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-pill icon-pill-lg bg-primary text-primary-foreground">
              <Icon name="unlock" size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">{puestoName}</div>
              <div className="t-sm text-muted-foreground">
                {sessionName}{sessionTime ? ` · ${sessionTime}` : ""}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="t-label">{t("inv.progress")}</div>
            <div className="t-sm font-bold">
              <span className="t-num">{filledCount}</span>/
              <span className="t-num">{totalProducts}</span> {t("inv.products")}
            </div>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      </div>

      {/* Cash input */}
      <div className="px-4 pt-3.5">
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="icon-pill bg-success/[0.12] text-success">
              <Icon name="cash" size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">{t("inv.initialCash")}</div>
              <div className="t-xs text-muted-foreground">{t("inv.initialFund")}</div>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">
              ₡
            </span>
            <input
              className="pp-input pp-input-lg pl-[30px] !text-[22px] !font-bold !font-display"
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0"
            />
          </div>
        </Card>
      </div>

      {/* Product list */}
      <div className="flex-1 px-4 pt-3.5 pb-[100px]">
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="t-label">{t("inv.countUnits")}</h3>
        </div>
        <div className="flex flex-col gap-2">
          {activeProducts.map((p) => {
            const val = counts[p.product_id];
            const filled = val !== "" && val !== null;
            return (
              <Card
                key={p.product_id}
                className={`p-3 transition-colors ${filled ? "!border-success/40" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <ProductImage imageUrl={p.image_url} name={p.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="t-xs text-muted-foreground">
                      {t("inv.sku", { sku: p.sku ?? "", price: fmt(p.price) })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => adjustCount(p.product_id, -1)}
                      aria-label={t("inv.subtract")}
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <input
                      className="t-num w-12 text-center text-base font-extrabold bg-transparent border-0 outline-none font-display"
                      type="number"
                      value={val}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [p.product_id]: e.target.value }))
                      }
                      placeholder="0"
                    />
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => adjustCount(p.product_id, 1)}
                      aria-label={t("inv.add")}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 z-overlay bg-background/90 backdrop-blur-md border-t border-border px-4 pt-3 pb-5">
        <div className="max-w-[440px] mx-auto flex gap-2.5 items-center">
          <div className="flex-1">
            <div className="t-label !text-[10px]">{t("inv.inventoryValue")}</div>
            <div className="t-stat !text-xl">{fmt(totalValue)}</div>
          </div>
          <Button
            variant="primary"
            size="xl"
            disabled={!allDone}
            onClick={() => setConfirmOpen(true)}
            className="flex-[1.2]"
          >
            <Icon name="check" size={16} /> {t("inv.openShift")}
          </Button>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        variant="success"
        title={t("inv.confirmTitle")}
        description={t("inv.confirmMessage")}
        cancel={{ label: t("inv.cancel"), onClick: () => setConfirmOpen(false) }}
        confirm={{
          label: t("inv.confirm"),
          onClick: () => mutation.mutate(),
          loading: mutation.isPending,
          loadingLabel: t("inv.saving"),
        }}
      >
        <Card className="p-3 !bg-muted/50 text-left">
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="text-muted-foreground">{t("inv.productsLabel")}</span>
            <span className="font-bold t-num">{t("inv.items", { n: totalProducts })}</span>
          </div>
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="text-muted-foreground">{t("inv.cashLabel")}</span>
            <span className="font-bold t-num">{fmt(Number(cash) || 0)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">{t("inv.stockValue")}</span>
            <span className="font-bold t-num">{fmt(totalValue)}</span>
          </div>
        </Card>
        {mutation.isError && (
          <p className="t-sm text-destructive mt-2.5">{t("inv.saveError")}</p>
        )}
      </Modal>
    </div>
  );
}
