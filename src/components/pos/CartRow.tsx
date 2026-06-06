import { Icon } from "@/components/ui";
import { ProductImage } from "@/components/ui/ProductImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentCurrencyOptional } from "@/contexts/DocumentCurrencyContext";

interface CartRowItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  lineDiscount?: number;
  lineNote?: string;
}

interface CartRowProps {
  item: CartRowItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onEdit: () => void;
}

export function CartRow({ item, onIncrease, onDecrease, onEdit }: CartRowProps) {
  const { t } = useLanguage();
  const { fmtConverted: fmt } = useDocumentCurrencyOptional();
  const displayPrice = item.price * (1 - (item.lineDiscount ?? 0) / 100);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border">
      <ProductImage imageUrl={item.image_url} name={item.name} size={40} className="rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
          {item.lineNote || item.name}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{fmt(displayPrice)} c/u</span>
          {(item.lineDiscount ?? 0) > 0 && (
            <span className="text-[10px] font-bold text-accent-rose bg-accent-rose-soft px-1.5 py-px rounded-sm">
              -{item.lineDiscount}%
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        title={t('lineEditor.editLine')}
        className="w-7 h-7 border-0 bg-transparent text-muted-foreground cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0"
      >
        <Icon name="edit" size={12} />
      </button>
      <div className="flex items-center gap-0.5 bg-foreground/[0.06] rounded-[20px] px-1 py-0.5">
        <button
          onClick={onDecrease}
          className="w-7 h-7 border-0 bg-transparent text-muted-foreground cursor-pointer rounded-[14px] flex items-center justify-center"
        >
          <Icon name="minus" size={12} />
        </button>
        <span className="min-w-[20px] text-center text-sm font-bold text-foreground tabular-nums">
          {item.qty}
        </span>
        <button
          onClick={onIncrease}
          className="w-7 h-7 border-0 bg-transparent text-accent-rose cursor-pointer rounded-[14px] flex items-center justify-center"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
      <div className="min-w-[70px] text-right text-[13px] font-bold text-foreground tabular-nums">
        {fmt(displayPrice * item.qty)}
      </div>
    </div>
  );
}
