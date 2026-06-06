import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomerType, type CustomerTypeValue } from "@/lib/enums";
import { FiltersModal } from "@/components/common/FiltersModal";

/**
 * Advanced filters for clients — customer type + sort. The most-used filters
 * (search, status) live on the toolbar itself, not duplicated here.
 */

export interface ClientAdvancedFilters {
  /** Canonical customer-type code from `@/lib/enums/customerTypes`. */
  customerType?: CustomerTypeValue;
  /** Backend orderBy syntax: `>field` (asc) or `<field` (desc). */
  sort?: string;
}

const CUSTOMER_TYPE_OPTIONS: { value: CustomerTypeValue; labelKey: string }[] = [
  { value: CustomerType.PERSONA_FISICA, labelKey: "clients.customerTypePerson" },
  { value: CustomerType.EMPRESA, labelKey: "clients.customerTypeCompany" },
];

interface Props {
  open: boolean;
  filters: ClientAdvancedFilters;
  onApply: (next: ClientAdvancedFilters) => void;
  onClose: () => void;
}

export function ClientAdvancedFiltersModal({ open, filters, onApply, onClose }: Props) {
  const { t } = useLanguage();
  const [local, setLocal] = useState<ClientAdvancedFilters>({ ...filters });
  const patch = (p: Partial<ClientAdvancedFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title={t("clients.advancedFilters")}
      onClear={() => setLocal({})}
      onApply={() => { onApply(local); onClose(); }}
      applyLabel={t("clients.applyFilters")}
    >
      <div className="space-y-1">
        <label className="t-label">{t("clients.customerType")}</label>
        <select
          value={local.customerType ?? ""}
          onChange={(e) =>
            patch({
              customerType: e.target.value
                ? (Number(e.target.value) as CustomerTypeValue)
                : undefined,
            })
          }
          className="pp-input"
        >
          <option value="">{t("clients.customerTypeAll")}</option>
          {CUSTOMER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="t-label">{t("clients.sortBy")}</label>
        <select
          value={local.sort ?? ""}
          onChange={(e) => patch({ sort: e.target.value || undefined })}
          className="pp-input"
        >
          <option value="">{t("clients.sortDefault")}</option>
          <option value=">client_name">{t("clients.sortNameAsc")}</option>
          <option value="<client_name">{t("clients.sortNameDesc")}</option>
          <option value="<created_on">{t("clients.sortNewest")}</option>
          <option value=">created_on">{t("clients.sortOldest")}</option>
        </select>
      </div>
    </FiltersModal>
  );
}
