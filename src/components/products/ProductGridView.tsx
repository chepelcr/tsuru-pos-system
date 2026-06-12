import { Card, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ProductImage } from "@/components/ui/ProductImage";
import { ProductPriceEditor } from "./ProductPriceEditor";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Product } from "@/types";

interface ProductGridViewProps {
  products: Product[];
  selected: string[];
  editingPrice: string | null;
  priceInput: string;
  /** RBAC: show edit / activate-deactivate / inline price edit (commercial/products update). */
  canUpdate?: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (p: Product) => void;
  onToggleActive: (id: string, status: number) => void;
  onStartEditPrice: (id: string, price: number) => void;
  onPriceInputChange: (v: string) => void;
  onSavePrice: (id: string, price: number) => void;
  onCancelEditPrice: () => void;
  onNavigate?: (id: string) => void;
}

const lowStock = (p: Product) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5;

export function ProductGridView({
  products,
  selected,
  editingPrice,
  priceInput,
  canUpdate = true,
  onToggleSelect,
  onEdit,
  onToggleActive,
  onStartEditPrice,
  onPriceInputChange,
  onSavePrice,
  onCancelEditPrice,
  onNavigate,
}: ProductGridViewProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {products.map((p, i) => (
        <FadeIn key={p.product_id} delay={i * 0.03} duration={0.4}>
          <Card
            hoverable
            className={`!p-0 overflow-hidden ${p.status !== 0 ? "opacity-100" : "opacity-60"} ${
              onNavigate ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={() => onNavigate?.(p.product_id)}
          >
            <div className="relative">
              <ProductImage
                imageUrl={p.image_url}
                name={p.name}
                size={0}
                className="w-full h-auto aspect-square !rounded-none object-cover"
                style={{ width: "100%", height: "auto" }}
              />
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={selected.includes(p.product_id)}
                  onChange={() => onToggleSelect(p.product_id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-[18px] h-[18px] cursor-pointer accent-primary"
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                {p.status === 0 && <Badge variant="secondary">{t("products.inactive")}</Badge>}
                {lowStock(p) && <Badge variant="warning">{t("products.stock", { n: String(p.stock_quantity) })}</Badge>}
              </div>
            </div>
            <div className="p-3.5">
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="text-sm font-bold leading-tight">{p.name}</div>
                <Badge variant="outline" className="flex-shrink-0 !text-[9px]">{p.category?.name ?? "—"}</Badge>
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <ProductPriceEditor
                  productId={p.product_id}
                  price={p.sale_price ?? p.price}
                  editing={editingPrice === p.product_id}
                  inputValue={priceInput}
                  align="left"
                  readOnly={!canUpdate}
                  onStartEdit={onStartEditPrice}
                  onInputChange={onPriceInputChange}
                  onSave={onSavePrice}
                  onCancel={onCancelEditPrice}
                />
                {canUpdate && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="xs" icon="edit" onClick={() => onEdit(p)} />
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={p.status === 1 ? "eye" : "eyeOff"}
                      onClick={() => onToggleActive(p.product_id, p.status === 1 ? 2 : 1)}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
