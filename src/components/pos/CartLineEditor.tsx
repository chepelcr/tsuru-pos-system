import { useState } from "react";
import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentCurrencyOptional } from "@/contexts/DocumentCurrencyContext";
import type { Product } from "@/types";

interface CartLineEditorProps {
  product: Product;
  qty: number;
  lineDiscount?: number;
  lineNote?: string;
  onSave: (patch: { qty: number; lineDiscount: number; lineNote: string }) => void;
  onClose: () => void;
}

export function CartLineEditor({ product, qty, lineDiscount = 0, lineNote = "", onSave, onClose }: CartLineEditorProps) {
  const { t } = useLanguage();
  const { fmt } = useDocumentCurrencyOptional();
  const [editQty, setEditQty] = useState(String(qty));
  const [editDiscount, setEditDiscount] = useState(String(lineDiscount));
  const [editNote, setEditNote] = useState(lineNote);

  const parsedQty = Math.max(1, parseInt(editQty) || 1);
  const parsedDiscount = Math.min(100, Math.max(0, parseFloat(editDiscount) || 0));
  const basePrice = product.sale_price ?? product.price;
  const lineTotal = basePrice * parsedQty * (1 - parsedDiscount / 100);

  const handleSave = () => {
    onSave({ qty: parsedQty, lineDiscount: parsedDiscount, lineNote: editNote.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/60 z-[9000] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl w-full max-w-[420px] shadow-modal overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-accent-rose uppercase tracking-[0.08em] mb-0.5">
              {t('lineEditor.editLine')}
            </div>
            <div className="font-display text-lg font-semibold text-foreground">{product.name}</div>
          </div>
          <button onClick={onClose} className="bg-transparent border-0 text-muted-foreground cursor-pointer p-1 flex">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="px-5 pt-5">
          {/* Quantity */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t('lineEditor.quantity')}</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditQty(String(Math.max(1, parsedQty - 1)))}
                className="w-9 h-9 border border-border bg-transparent text-foreground cursor-pointer rounded-lg flex items-center justify-center"
              >
                <Icon name="minus" size={14} />
              </button>
              <input
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-base font-bold text-center"
              />
              <button
                onClick={() => setEditQty(String(parsedQty + 1))}
                className="w-9 h-9 border border-border bg-transparent text-accent-rose cursor-pointer rounded-lg flex items-center justify-center"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>

          {/* Discount */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              {t('lineEditor.lineDiscount')}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value)}
                placeholder="0"
                className="w-full pl-3 pr-10 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm box-border"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Note */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              {t('lineEditor.note')}
            </label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder={product.name}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm box-border"
            />
          </div>

          {/* Taxes (read-only) */}
          {product.taxes && product.taxes.length > 0 && (
            <div className="mb-4 px-3.5 py-3 bg-background rounded-lg border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2">
                {t('lineEditor.productTaxes')}
              </div>
              {product.taxes.map((tx, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{t('lineEditor.codeLabel', { code: tx.tax_code ?? '—' })}</span>
                  <span className="text-xs text-foreground font-semibold">{tx.rate}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Line total preview */}
          <div className="py-3.5 border-t border-border flex justify-between items-center mb-5">
            <span className="text-[13px] text-muted-foreground">{t('lineEditor.lineTotal')}</span>
            <span className="font-display text-[22px] font-bold text-accent-rose">{fmt(lineTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-border bg-transparent text-foreground rounded-lg text-sm font-semibold cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-3 border-0 bg-accent-rose text-background rounded-lg text-sm font-bold cursor-pointer"
          >
            {t('lineEditor.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
