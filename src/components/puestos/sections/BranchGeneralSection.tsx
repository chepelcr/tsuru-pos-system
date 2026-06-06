import { Store } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { Icon, Input, FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
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
  
  const TYPE_LABEL: Record<BranchType, string> = { 
    stand: t("puestos.stand"), 
    restaurant: t("puestos.restaurant") 
  };

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
            {(["stand", "restaurant"] as BranchType[]).map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => setType(bt)}
                className={`px-4 py-3 rounded-lg border-2 cursor-pointer flex items-center gap-2 text-sm transition-all ${
                  type === bt
                    ? "border-primary bg-primary/[0.08] text-primary font-bold"
                    : "border-border bg-transparent text-foreground font-medium"
                }`}
              >
                <Icon name={bt === "stand" ? "store" : "home"} size={15} />
                {TYPE_LABEL[bt]}
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
