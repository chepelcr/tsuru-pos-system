import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchTypeOptions } from "@/hooks/useBranchTypes";
import { FiltersModal } from "@/components/common/FiltersModal";

/**
 * Advanced filters for the puestos (branches) list — type + sort.
 * Search, status are kept on the main toolbar (most-used filters).
 */

export interface BranchAdvancedFilters {
  /** Hacienda branch type code. Empty string means "all". */
  type?: string;
  /** Backend orderBy syntax: `>field` (asc) or `<field` (desc). */
  sort?: string;
}

interface Props {
  open: boolean;
  filters: BranchAdvancedFilters;
  onApply: (next: BranchAdvancedFilters) => void;
  onClose: () => void;
}

export function BranchAdvancedFiltersModal({ open, filters, onApply, onClose }: Props) {
  const { t } = useLanguage();
  const typeOptions = useBranchTypeOptions();
  const [local, setLocal] = useState<BranchAdvancedFilters>({ ...filters });
  const patch = (p: Partial<BranchAdvancedFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title={t("puestos.advancedFilters")}
      onClear={() => setLocal({})}
      onApply={() => { onApply(local); onClose(); }}
      applyLabel={t("puestos.applyFilters")}
    >
      <div className="space-y-1">
        <label className="t-label">{t("puestos.type")}</label>
        <select
          value={local.type ?? ""}
          onChange={(e) => patch({ type: e.target.value || undefined })}
          className="pp-input"
        >
          <option value="">{t("puestos.all")}</option>
          {typeOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>{opt.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="t-label">{t("puestos.sortBy")}</label>
        <select
          value={local.sort ?? ""}
          onChange={(e) => patch({ sort: e.target.value || undefined })}
          className="pp-input"
        >
          <option value="">{t("puestos.sortDefault")}</option>
          <option value=">name">{t("puestos.sortNameAsc")}</option>
          <option value="<name">{t("puestos.sortNameDesc")}</option>
          <option value="<created_on">{t("puestos.sortNewest")}</option>
        </select>
      </div>
    </FiltersModal>
  );
}
