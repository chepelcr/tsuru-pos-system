import { Badge, Icon } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/hooks/useProducts";
import { useInventory } from "@/store/inventory";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentCurrencyOptional } from "@/contexts/DocumentCurrencyContext";

interface ProductGridProps {
  products: Product[];
  cart: Record<number, number>;
  onAdd: (product: Product) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
}

export default function ProductGrid({ products, cart, onAdd, category, onCategoryChange }: ProductGridProps) {
  const getStock = useInventory((s) => s.getStock);
  const { t } = useLanguage();
  const { fmt } = useDocumentCurrencyOptional();

  const CATEGORIES = [
    { id: "Todos", label: t("pos.allCategories") },
    { id: "Comida", label: "Comida" },
    { id: "Bebida", label: "Bebida" },
  ];

  const filtered =
    category === "Todos" ? products : products.filter((p) => (p as any).category_id === category);

  return (
    <>
      {/* Category tabs */}
      <div className="flex gap-2 px-3 py-2.5 bg-card border-b border-border flex-shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`btn btn-sm ${category === cat.id ? "btn-primary" : "btn-outline"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5 content-start">
        {filtered.map((p) => {
          const pid = p.product_id;
          const inCart = cart[pid as any] ?? 0;
          const localStock = getStock(pid);
          const stock = localStock !== undefined ? localStock : (p.stock_quantity ?? 0);
          const isOut = stock === 0;
          const isLow = stock > 0 && stock <= 3;

          const borderClass = inCart > 0 ? "border-primary/50" : "border-border";
          const bgClass = isOut
            ? "bg-muted/40"
            : inCart > 0
            ? "bg-primary/[0.06]"
            : "bg-card";

          return (
            <button
              key={p.product_id}
              type="button"
              onClick={() => onAdd(p)}
              disabled={isOut}
              className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-[1.5px] text-left min-h-[90px] transition-colors ${borderClass} ${bgClass} ${
                isOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {/* Stock badge */}
              {isOut && (
                <div className="absolute top-1.5 right-1.5">
                  <Badge variant="destructive">{t('productGrid.outOfStock')}</Badge>
                </div>
              )}
              {isLow && !isOut && (
                <div className="absolute top-1.5 right-1.5">
                  <Badge variant="warning">
                    <Icon name="alert" size={10} />
                    {" "}{stock}
                  </Badge>
                </div>
              )}

              {/* Cart count bubble */}
              {inCart > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-display text-[11px] font-extrabold">
                  {inCart}
                </div>
              )}

              <ProductImage imageUrl={p.image_url} name={p.name} size={28} />
              <span className="text-sm font-bold font-display leading-tight text-foreground">
                {p.name}
              </span>
              <span
                className={`t-num text-base font-extrabold ${
                  inCart > 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {fmt(p.sale_price ?? p.price)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
