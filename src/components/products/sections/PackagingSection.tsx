import { Package2 } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface PackagingSectionProps {
  unitsPerBox: string;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onChange: (unitsPerBox: string) => void;
}

export function PackagingSection({
  unitsPerBox,
  isExpanded,
  onToggle,
  disabled,
  onChange,
}: PackagingSectionProps) {
  const { t } = useLanguage();

  return (
    <SectionWrapper
      title={t("products.packageInfo")}
      icon={Package2}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      <div>
        <FormLabel required>{t("products.unitsPerBox")}</FormLabel>
        <input
          type="number"
          className="pp-input"
          placeholder={t("products.unitsPerBoxPlaceholder")}
          min={1}
          value={unitsPerBox}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </SectionWrapper>
  );
}
