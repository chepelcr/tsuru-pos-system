import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui';
import { useCart, type CartItem as StoreCartItem } from '@/store/cart';
import { LineDetailDrawer } from './line-detail/LineDetailDrawer';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { getDocumentTypeInfo } from '@/types/invoice';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentCurrencyOptional } from '@/contexts/DocumentCurrencyContext';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import type { Product } from '@/types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  lineDiscount?: number;
  lineNote?: string;
  product: Product;
}

interface CartSidebarProps {
  cartItems: CartItem[];
  cartTotal: number;
  subtotal: number;
  taxAmount: number;
  items: Record<string, StoreCartItem>;
  selectedClient: ClientSearchResult | null;
  onAdd: (product: Product) => void;
  onRemove: (id: string) => void;
  onUpdateLine: (id: string, patch: { 
    qty?: number; 
    lineDiscount?: number; 
    lineNote?: string;
    lineDetail?: any;
  }) => void;
  onCheckout: () => void;
  onSelectClient: () => void;
  onClearClient: () => void;
  onEditReceiver: () => void;
}

export function CartSidebar({
  cartItems,
  cartTotal,
  subtotal,
  taxAmount,
  items,
  selectedClient,
  onAdd,
  onRemove,
  onUpdateLine,
  onCheckout,
  onSelectClient,
  onClearClient,
  onEditReceiver,
}: CartSidebarProps) {
  const { doc_type } = useCart();
  const docInfo = getDocumentTypeInfo(doc_type);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, ConfirmModal } = useConfirmModal();
  const { t } = useLanguage();
  const { fmtConverted: fmt } = useDocumentCurrencyOptional();
  const editingItem = editingId ? items[editingId] : null;

  const handleRemove = (itemId: string) => {
    const item = items[itemId];
    if (!item) return;

    // If quantity is 1, confirm before removing
    if (item.qty <= 1) {
      confirm({
        title: t("cart.removeTitle"),
        message: t("cart.removeMessage", { name: item.product.name }),
        variant: "destructive",
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        icon: "trash",
        onConfirm: () => onRemove(itemId),
      });
    } else {
      // Just decrement
      onRemove(itemId);
    }
  };

  const handleDelete = (itemId: string) => {
    const item = items[itemId];
    if (!item) return;

    confirm({
      title: t("cart.removeTitle"),
      message: t("cart.removeMessage", { name: item.product.name }),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      icon: "trash",
      onConfirm: () => onUpdateLine(itemId, { qty: 0 }),
    });
  };

  return (
    <>
      <aside className="flex flex-col bg-card overflow-hidden border-l border-border h-full">
        {/* Header — title + doc-type badge (read-only; set from launch URL) */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold text-[15px]">{t('cart.order')}</span>
            <span className="px-1.5 h-5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold t-num">
              {cartItems.length}
            </span>
            {docInfo && (
              <span
                className={cn(
                  'ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-white bg-gradient-to-r',
                  docInfo.tabGradient
                )}
                title={t(`docTypes.${doc_type}`)}
              >
                {docInfo.short}
              </span>
            )}
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={() => useCart.getState().clear()}
              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
            >
              {t('cart.clear')}
            </button>
          )}
        </div>

        {/* Customer button */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          {selectedClient ? (
            <div className="w-full h-9 rounded-md border border-primary/40 bg-primary/[0.04] text-[12px] flex items-center px-3 gap-2">
              <button
                type="button"
                onClick={onSelectClient}
                className="flex-1 min-w-0 flex items-center gap-2 text-left text-primary"
              >
                <span className="shrink-0">👤</span>
                <span className="truncate font-semibold">
                  {selectedClient.client_name || selectedClient.business_name || t('cart.client')}
                </span>
              </button>
              <button
                type="button"
                onClick={onEditReceiver}
                title={t('cart.editClient')}
                className="w-6 h-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center shrink-0"
              >
                <Icon name="edit" size={11} />
              </button>
              <button
                type="button"
                onClick={onClearClient}
                title={t('common.delete')}
                className="w-6 h-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0"
              >
                <Icon name="close" size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelectClient}
              className="w-full h-9 rounded-md border border-dashed border-border text-[12px] flex items-center justify-between px-3 hover:bg-muted transition-colors text-muted-foreground"
            >
              <span className="truncate flex items-center gap-2">
                <span className="shrink-0">👤</span>
                <span className="truncate">{t('cart.clientOptional')}</span>
              </span>
              <span className="text-muted-foreground shrink-0">›</span>
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-auto scroll-area px-3 py-2 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8 gap-2">
              <span className="text-3xl opacity-40">🛒</span>
              <div className="text-[12px]">{t('cart.empty')}<br />{t('cart.emptyHint')}</div>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background p-2.5">
                <div className="flex justify-between gap-2">
                  <span className="text-[12px] font-semibold leading-tight line-clamp-1">{item.lineNote || item.name}</span>
                  <span className="text-[11px] font-mono t-num shrink-0">{fmt(item.price * item.qty)}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <button
                    onClick={() => setEditingId(item.id)}
                    className="text-[10px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded border border-border hover:border-primary/40"
                  >
                    %
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="w-6 h-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:border-primary/40 text-xs"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-[12px] font-mono t-num">{item.qty}</span>
                    <button
                      onClick={() => items[item.id] && onAdd(items[item.id].product)}
                      className="w-6 h-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:border-primary/40 text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-6 h-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 ml-1 text-xs"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="px-4 py-3 border-t border-border space-y-1 text-[12px] shrink-0">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.subtotal')}</span>
            <span className="font-mono t-num">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.iva')}</span>
            <span className="font-mono t-num">{fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-[15px] font-display font-extrabold pt-1">
            <span>{t('cart.total')}</span>
            <span className="font-mono t-num text-primary">{fmt(cartTotal)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cartItems.length === 0}
            className="mt-2 w-full h-11 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('cart.checkoutWith', { amount: fmt(cartTotal) })}
            <span>›</span>
          </button>
        </div>
      </aside>

      {/* Line detail drawer */}
      <LineDetailDrawer
        open={editingId !== null}
        product={editingItem?.product ?? null}
        qty={editingItem?.qty ?? 1}
        lineDiscount={editingItem?.lineDiscount}
        lineNote={editingItem?.lineNote}
        lineDetail={editingItem?.lineDetail}
        documentType={doc_type}
        onSave={(patch) => { 
          if (editingId) {
            onUpdateLine(editingId, patch); 
            setEditingId(null); 
          }
        }}
        onDelete={() => {
          if (editingId) {
            onUpdateLine(editingId, { qty: 0 });
            setEditingId(null);
          }
        }}
        onClose={() => setEditingId(null)}
      />
      
      {/* Confirmation Modal */}
      <ConfirmModal />
    </>
  );
}
