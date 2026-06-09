import { Store } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { Icon, Input, FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchTypeOptions } from "@/hooks/useBranchTypes";
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
  const typeOptions = useBranchTypeOptions();

  return (
    <SectionWrapper
      title="Información General"
      icon={Store}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        {/* Type toggle */}
        <div>
          <FormLabel>{t("session.sessionType")}</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setType(opt.code)}
                className={`px-4 py-3 rounded-lg border-2 cursor-pointer flex items-center gap-2 text-sm transition-all ${
                  type === opt.code
                    ? "border-primary bg-primary/[0.08] text-primary font-bold"
                    : "border-border bg-transparent text-foreground font-medium"
                }`}
              >
                {/* icon name comes from the catalog (data-driven) */}
                <Icon name={(opt.icon || "store") as never} size={15} />
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <FormLabel htmlFor="b-name" required>
            {t("products.name")}
          </FormLabel>
          <Input
            id="b-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Puesto Principal, Sector Norte…"
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
