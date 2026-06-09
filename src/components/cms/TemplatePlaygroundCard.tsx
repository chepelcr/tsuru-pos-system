import { Icon, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplatePlaygroundCardProps {
  /** True when the org has no template applied (blank storefront). */
  isSelected: boolean;
  /** Apply the blank/playground template (passes `null` upstream). */
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * "Start from scratch" card. Re-skinned from the dashboard `PlaygroundCard` —
 * the burned gradient (`bg-gradient-to-br from-primary/5 to-secondary/5`,
 * `text-white`) is stripped in favour of the POS `.card` + design-system
 * tokens. Selecting it applies a blank storefront (`templateId === null`).
 */
export function TemplatePlaygroundCard({
  isSelected,
  onSelect,
  disabled,
}: TemplatePlaygroundCardProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`card card-hover overflow-hidden flex flex-col ${
        isSelected ? "card-primary ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="relative aspect-[16/10] bg-muted/40 flex items-center justify-center border-b border-border border-dashed">
        <span className="icon-pill icon-pill-lg icon-pill-primary-soft w-14 h-14">
          <Icon name="plus" size={26} />
        </span>
        {isSelected && (
          <span className="absolute top-2.5 right-2.5 icon-pill icon-pill-primary-soft w-7 h-7">
            <Icon name="check" size={15} />
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="t-h4 !mb-0">{t("playground.title")}</h3>
        <p className="t-sm text-muted-foreground line-clamp-2 flex-1">
          {t("playground.description")}
        </p>
        <Button
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          icon={isSelected ? "check" : "plus"}
          className="mt-1"
          onClick={onSelect}
          disabled={disabled || isSelected}
        >
          {isSelected ? t("template.card.active") : t("playground.start")}
        </Button>
      </div>
    </div>
  );
}
