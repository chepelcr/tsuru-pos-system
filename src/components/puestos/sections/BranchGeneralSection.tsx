import { Store } from "lucide-react";
import { Link } from "wouter";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { Input, FormLabel, Select, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchTypes } from "@/hooks/useBranchTypes";
import { useOrgContext } from "@/contexts/OrgContext";
import { usePermissions } from "@/hooks/useRbac";
import { ROUTES } from "@/routePaths";
import type { BranchType } from "@/types";

interface BranchGeneralSectionProps {
  name: string;
  setName: (value: string) => void;
  code: number | "";
  setCode: (value: number | "") => void;
  type: BranchType;
  setType: (value: BranchType) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BranchGeneralSection({
  name,
  setName,
  code,
  setCode,
  type,
  setType,
  isExpanded,
  onToggle,
}: BranchGeneralSectionProps) {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const catalog = useBranchTypes(orgId);
  const typeOptions = catalog.data ?? [];
  const { can } = usePermissions();

  return (
    <SectionWrapper
      title={t("branch.generalInfo")}
      icon={Store}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        {/* Type toggle */}
        <div>
          <FormLabel htmlFor="b-type" required>{t("branchTypes.label")}</FormLabel>
          <Select id="b-type" required value={typeOptions.some((o) => o.code === type) ? type : ""}
            onChange={(e) => setType(e.target.value)} disabled={catalog.isLoading || catalog.isError || !typeOptions.length}>
            <option value="">{t(catalog.isLoading ? "common.loading" : "branchTypes.select")}</option>
            {typeOptions.map((opt) => <option key={opt.id} value={opt.code}>{opt.name}</option>)}
          </Select>
          {catalog.isError ? (
            <div role="alert" className="mt-2 text-destructive t-sm">
              {t("branchTypes.loadError")}
              <Button type="button" variant="link" size="sm" onClick={() => catalog.refetch()}>{t("common.retry")}</Button>
            </div>
          ) : !catalog.isLoading && !typeOptions.length ? (
            <p className="t-sm mt-2 text-muted-foreground">{t("branchTypes.emptyDescription")}</p>
          ) : null}
          {can("admin", "read", "branch-types") && (
            <Link href={ROUTES.DASHBOARD_BRANCH_TYPES} className="block mt-2 text-sm text-primary hover:underline">
              {t("branchTypes.manage")}
            </Link>
          )}
        </div>

        {/* Name */}
        <div>
          <FormLabel htmlFor="b-name" required>
            {t("common.name")}
          </FormLabel>
          <Input
            id="b-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("branch.namePlaceholder")}
          />
        </div>

        {/* Code */}
        <div>
          <FormLabel htmlFor="b-code" required>
            {t("products.sku")}
          </FormLabel>
          <Input
            id="b-code"
            required
            type="number"
            min={1}
            value={code}
            onChange={(e) => setCode(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="ej. 1"
            className="font-mono"
          />
          <p className="t-xs mt-1 text-muted-foreground">
            Número único por organización (entero positivo).
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
