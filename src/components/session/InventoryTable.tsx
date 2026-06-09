import { Card, CardTitle, CardDescription, Badge } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Product } from "@/hooks/useProducts";

interface Branch {
  branch_id: string;
  name: string;
  code: number;
  type: string;
  status: number;
}

interface InventoryTableProps {
  products: Product[];
  selectedBranches: Branch[];
  selectedProducts: Set<string>;
  inventory: Record<string, Record<string, number>>;
  toggleProduct: (productId: string) => void;
  setInventory: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
}

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");

export default function InventoryTable({
  products,
  selectedBranches,
  selectedProducts,
  inventory,
  toggleProduct,
  setInventory,
}: InventoryTableProps) {
  const { t } = useLanguage();

  const activeProducts = products.filter((p) => p.status === 1);

  return (
    <Card className="!p-0">
      <div className="px-6 py-[18px] border-b border-border">
        <CardTitle>{t("session.inventoryTitle")}</CardTitle>
        <CardDescription>{t("session.inventoryDesc")}</CardDescription>
      </div>

      {/* Desktop table layout */}
      <div className="inv-desktop overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="pp-th w-10">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === activeProducts.length && activeProducts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      toggleProduct("__SELECT_ALL__");
                    } else {
                      toggleProduct("__DESELECT_ALL__");
                    }
                  }}
                />
              </th>
              <th className="pp-th">Producto</th>
              {selectedBranches.map((b) => (
                <th key={b.branch_id} className="pp-th !text-center">
                  {b.name}
                </th>
              ))}
              {selectedBranches.length === 0 && (
                <th className="pp-th !text-center">{t("session.selectFirst")}</th>
              )}
              <th className="pp-th !text-right">{t("session.total")}</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map((p) => {
              const needsInventory = p.track_inventory === true;
              const total = needsInventory
                ? selectedBranches.reduce(
                    (s, b) => s + (inventory[b.branch_id]?.[p.product_id] ?? 0),
                    0
                  )
                : 0;
              const isSelected = selectedProducts.has(p.product_id);

              return (
                <tr
                  key={p.product_id}
                  className={`border-b border-border ${isSelected ? "" : "opacity-50"}`}
                >
                  <td className="pp-td text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProduct(p.product_id)}
                    />
                  </td>
                  <td className="pp-td">
                    <div className="flex items-center gap-2.5">
                      <ProductImage imageUrl={p.image_url} name={p.name} size={32} />
                      <div>
                        <div className="text-[13px] font-semibold">{p.name}</div>
                        <div className="t-xs text-muted-foreground">
                          {fmt(p.price)}
                          {!needsInventory && (
                            <Badge variant="secondary" className="ml-1.5 text-[9px]">
                              {t("session.noInventoryTracking")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {selectedBranches.map((b) => (
                    <td key={b.branch_id} className="pp-td text-center">
                      {needsInventory ? (
                        <input
                          className="input input-sm t-num w-[70px] mx-auto text-center font-bold font-display block"
                          type="number"
                          min={0}
                          disabled={!isSelected}
                          value={inventory[b.branch_id]?.[p.product_id] ?? 0}
                          onChange={(e) =>
                            setInventory((inv) => ({
                              ...inv,
                              [b.branch_id]: {
                                ...inv[b.branch_id],
                                [p.product_id]: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      ) : (
                        <span className="t-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                  {selectedBranches.length === 0 && (
                    <td className="pp-td text-center text-muted-foreground">—</td>
                  )}
                  <td className="pp-td text-right font-extrabold font-display t-num">
                    {needsInventory ? total : "—"}
                  </td>
                </tr>
              );
            })}
            {activeProducts.length === 0 && (
              <tr>
                <td
                  colSpan={selectedBranches.length + 3}
                  className="pp-td text-center text-muted-foreground !p-8"
                >
                  {t("session.noActiveProducts")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="inv-mobile">
        {activeProducts.length === 0 ? (
          <p className="t-sm text-muted-foreground text-center py-6">
            {t("session.noActiveProducts")}
          </p>
        ) : (
          activeProducts.map((p) => {
            const needsInventory = p.track_inventory === true;
            const isSelected = selectedProducts.has(p.product_id);
            const hasBranchRows = needsInventory && selectedBranches.length > 0;

            return (
              <div
                key={p.product_id}
                className={`border border-border rounded-lg overflow-hidden ${
                  isSelected ? "" : "opacity-[0.55]"
                }`}
              >
                {/* Card header */}
                <div
                  className={`flex items-center gap-2.5 px-3.5 py-3 bg-muted/35 ${
                    hasBranchRows ? "border-b border-border" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProduct(p.product_id)}
                    className="flex-shrink-0"
                  />
                  <ProductImage imageUrl={p.image_url} name={p.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                      {p.name}
                    </div>
                    <div className="t-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {fmt(p.price)}
                      {!needsInventory && (
                        <Badge variant="secondary" className="text-[9px]">
                          {t("session.noInventoryTracking")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branch quantity rows — only when inventory tracking is on */}
                {hasBranchRows && (
                  <div>
                    {selectedBranches.map((b, bi) => (
                      <div
                        key={b.branch_id}
                        className={`flex items-center justify-between px-3.5 py-2.5 gap-2.5 ${
                          bi < selectedBranches.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <span className="t-sm font-medium text-muted-foreground">
                          {b.name}
                        </span>
                        <input
                          className="input input-sm t-num w-20 text-center font-bold font-display"
                          type="number"
                          min={0}
                          disabled={!isSelected}
                          value={inventory[b.branch_id]?.[p.product_id] ?? 0}
                          onChange={(e) =>
                            setInventory((inv) => ({
                              ...inv,
                              [b.branch_id]: {
                                ...inv[b.branch_id],
                                [p.product_id]: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {needsInventory && selectedBranches.length === 0 && (
                  <div className="px-3.5 py-2.5">
                    <span className="t-xs text-muted-foreground">
                      {t("session.selectFirst")}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
