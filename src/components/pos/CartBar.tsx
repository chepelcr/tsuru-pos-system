import { Icon, Button } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";

interface CartItem {
  product: Product;
  qty: number;
}

interface CartBarProps {
  items: CartItem[];
  total: number;
  count: number;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartBar({ items, total, count, onAdd, onRemove, onCheckout }: CartBarProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-card border-t border-border px-3 py-2.5 flex-shrink-0">
      {items.length > 0 && (
        <div className="max-h-[120px] overflow-y-auto mb-2.5 flex flex-col gap-1.5">
          {items.map(({ product, qty }) => (
            <div
              key={product.product_id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRemove(product.product_id)}
                  className="btn btn-outline btn-xs btn-icon"
                  type="button"
                >
                  <Icon name="minus" size={12} />
                </button>
                <span className="t-xs w-4 text-center font-mono font-bold">
                  {qty}
                </span>
                <button
                  onClick={() => onAdd(product)}
                  className="btn btn-xs btn-icon btn-primary-soft"
                  type="button"
                >
                  <Icon name="plus" size={12} />
                </button>
                <ProductImage imageUrl={product.image_url} name={product.name} size={20} className="rounded-sm" />
                <span className="t-sm font-medium">{product.name}</span>
              </div>
              <span className="t-num text-[13px] font-bold text-primary">
                ₡{(product.price * qty).toLocaleString("es-CR")}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        size="xl"
        onClick={onCheckout}
        disabled={items.length === 0}
        className="w-full !flex !justify-between"
      >
        <span className="flex items-center gap-2">
          <Icon name="cart" size={18} />
          {items.length > 0
            ? `${count} ${count !== 1 ? t("cart.items") : t("cart.item")}`
            : t("cart.selectProducts")}
        </span>
        {items.length > 0 && (
          <span className="t-num text-lg font-extrabold">
            ₡{total.toLocaleString("es-CR")}
          </span>
        )}
      </Button>
    </div>
  );
}
