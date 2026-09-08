import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Drawer, Icon, Select, Spinner } from '@/components/ui';
import { useStores } from '@/hooks/useStores';
import { useSalePointMutations, type SalePointItemInput } from '@/hooks/useSalePoints';
import type { Order } from '@/types/order';

interface SalePointFormDrawerProps {
  open: boolean;
  onClose: () => void;
  orgId?: string;
  order: Order;
}

/**
 * Capture a cross-docking sale point by hand (TSR-157).
 *
 * Sits beside the Excel upload rather than replacing it: both write the same
 * rows, so a supplier can upload a partial file and finish the rest here.
 *
 * Totals are deliberately NOT editable — they are derived server-side from the
 * lines, the same way the parser derives them, which is what keeps a
 * hand-captured order reconcilable against an imported one.
 */
export function SalePointFormDrawer({ open, onClose, orgId, order }: SalePointFormDrawerProps) {
  const { t } = useLanguage();
  const { data: storesResp } = useStores(orgId, order.client_id ?? undefined, { page_size: 100 });
  const { createSalePoint } = useSalePointMutations(orgId, order.document_number);

  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<SalePointItemInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stores = storesResp?.data ?? [];

  // Only products the order actually contains can be distributed — allocating
  // something that was never ordered is rejected server-side anyway.
  const orderProducts = useMemo(
    () =>
      (order.lines ?? [])
        .filter((l) => l.product_id)
        .map((l) => ({
          product_id: l.product_id as string,
          description: l.description || l.internal_code || l.product_id!,
          ordered: l.quantity_ordered ?? 0,
        })),
    [order.lines],
  );

  const totalBoxes = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const submit = async () => {
    setError(null);
    if (!storeId && !name.trim()) return setError(t('salePoint.error.nameRequired'));
    if (items.length === 0) return setError(t('salePoint.error.noItems'));

    try {
      await createSalePoint.mutateAsync({
        store_id: storeId || undefined,
        full_name: name.trim() || undefined,
        items: items.filter((i) => i.product_id && i.quantity > 0),
      });
      setStoreId('');
      setName('');
      setItems([]);
      onClose();
    } catch (e) {
      // The server names the offending line when an allocation exceeds what
      // was ordered — surface it rather than a generic failure.
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  return (
    <Drawer
      closeLabel={t('common.close')}
      open={open}
      onClose={onClose}
      title={t('salePoint.title')}
      subtitle={t('salePoint.subtitle')}
      icon="store"
      width={520}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={createSalePoint.isPending}
          >
            {createSalePoint.isPending ? <Spinner size={14} /> : null}
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 t-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="label-section">{t('salePoint.source.store')}</label>
          <Select
            className="pp-input w-full"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">{t('salePoint.source.manual')}</option>
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                {s.store_code}
                {s.store_name ? ` — ${s.store_name}` : ''}
              </option>
            ))}
          </Select>
        </div>

        {!storeId && (
          <div className="space-y-1">
            <label className="label-section" htmlFor="sale-point-name">
              {t('salePoint.name')}
            </label>
            <input
              id="sale-point-name"
              className="pp-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label-section">{t('salePoint.items')}</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setItems((prev) => [...prev, { product_id: '', quantity: 0 }])}
            >
              <Icon name="plus" size={13} />
              {t('salePoint.item.add')}
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
              <Select
                className="pp-input w-full"
                value={item.product_id}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, product_id: e.target.value } : it)),
                  )
                }
              >
                <option value="">{t('placeholder.selectOption')}</option>
                {orderProducts.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.description} ({p.ordered})
                  </option>
                ))}
              </Select>
              <input
                type="number"
                min={0}
                className="pp-input w-full t-num"
                placeholder={t('salePoint.item.boxes')}
                value={item.quantity || ''}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) =>
                      i === idx ? { ...it, quantity: parseInt(e.target.value, 10) || 0 } : it,
                    ),
                  )
                }
              />
              <button
                className="btn-icon-ghost-xs"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}

          <p className="t-xs text-muted-foreground">
            {totalBoxes > 0 ? `${totalBoxes} · ` : ''}
            {t('salePoint.totals.derived')}
          </p>
        </div>
      </div>
    </Drawer>
  );
}
