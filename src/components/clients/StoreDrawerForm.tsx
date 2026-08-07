import { useState, useEffect } from "react";
import { Drawer, Button } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Store, StoreRequestDto } from "@/types";

interface StoreDrawerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: StoreRequestDto) => Promise<void>;
  store?: Store | null;
  saving?: boolean;
}

function buildForm(store?: Store | null): StoreRequestDto {
  return {
    store_code: store?.store_code ?? "",
    store_name: store?.store_name ?? "",
    chain: store?.chain ?? "",
    slot_id: store?.slot_id ?? "",
  };
}

export function StoreDrawerForm({ open, onClose, onSubmit, store, saving }: StoreDrawerFormProps) {
  const { t } = useLanguage();
  const isEdit = !!store;
  const [form, setForm] = useState<StoreRequestDto>(() => buildForm(store));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(store));
      setError(null);
    }
  }, [open, store]);

  const patch = (next: Partial<StoreRequestDto>) => setForm((prev) => ({ ...prev, ...next }));

  async function handleSave() {
    if (!form.store_code?.trim()) {
      setError(t("stores.validation.storeCodeRequired"));
      return;
    }
    setError(null);
    const dto: StoreRequestDto = {
      store_code: form.store_code.trim(),
      ...(form.store_name?.trim() && { store_name: form.store_name.trim() }),
      ...(form.chain?.trim() && { chain: form.chain.trim() }),
      ...(form.slot_id?.trim() && { slot_id: form.slot_id.trim() }),
    };
    try {
      await onSubmit(dto);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={isEdit ? t("stores.editStore") : t("common.add")}
      subtitle={isEdit ? store?.store_code : undefined}
      icon="store"
      width={460}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="p-5 flex flex-col gap-4">
        <FormField label={t("stores.fields.storeCode")} required>
          <input
            className="pp-input w-full"
            value={form.store_code ?? ""}
            onChange={(e) => patch({ store_code: e.target.value })}
            placeholder={t("stores.fields.storeCodePlaceholder")}
          />
        </FormField>

        <FormField label={t("stores.fields.storeName")}>
          <input
            className="pp-input w-full"
            value={form.store_name ?? ""}
            onChange={(e) => patch({ store_name: e.target.value })}
            placeholder={t("stores.fields.storeNamePlaceholder")}
          />
        </FormField>

        <FormField label={t("stores.fields.chain")}>
          <input
            className="pp-input w-full"
            value={form.chain ?? ""}
            onChange={(e) => patch({ chain: e.target.value })}
            placeholder={t("stores.fields.chainPlaceholder")}
          />
        </FormField>

        <FormField label={t("stores.fields.slotId")}>
          <input
            className="pp-input w-full"
            value={form.slot_id ?? ""}
            onChange={(e) => patch({ slot_id: e.target.value })}
            placeholder={t("stores.fields.slotIdPlaceholder")}
          />
        </FormField>

        {error && (
          <div className="px-3 py-2.5 bg-destructive/[0.08] rounded-lg text-xs text-destructive border border-destructive/20">
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}
