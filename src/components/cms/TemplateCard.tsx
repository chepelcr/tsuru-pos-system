import { Icon } from "@/components/ui";
import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { templateCategoryIcon } from "./templateCategory";
import type { Template } from "@/types";

interface TemplateCardProps {
  template: Template;
  /** True when this template is the org's currently-applied storefront. */
  isSelected: boolean;
  onPreview: (template: Template) => void;
  onSelect: (template: Template) => void;
  disabled?: boolean;
}

/**
 * A single storefront-template card in the gallery. Re-skinned from the
 * dashboard `TemplateCard` — shadcn `Card` → POS `.card`, literal Tailwind
 * palette classes (`bg-pink-500/10`…) → design-system tokens. Category maps to
 * a curated `<Icon>` via {@link templateCategoryIcon}; colour is always the
 * primary-soft pill token (no per-palette literals — CLAUDE.md §3).
 */
export function TemplateCard({
  template,
  isSelected,
  onPreview,
  onSelect,
  disabled,
}: TemplateCardProps) {
  const { t } = useLanguage();
  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canApply = !permsReady || can("storefront", "update", "templates");

  return (
    <div
      className={`card card-hover overflow-hidden flex flex-col ${
        isSelected ? "card-primary ring-2 ring-primary/40" : ""
      }`}
    >
      {/* Thumbnail (fallback placeholder when none) */}
      <div className="relative aspect-[16/10] bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="icon-pill icon-pill-lg icon-pill-muted w-14 h-14">
            <Icon name={templateCategoryIcon(template.category)} size={26} strokeWidth={1.5} />
          </span>
        )}

        {isSelected && (
          <span className="absolute top-2.5 right-2.5 icon-pill icon-pill-primary-soft w-7 h-7">
            <Icon name="check" size={15} />
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="icon-pill icon-pill-primary-soft w-8 h-8 flex-shrink-0">
            <Icon name={templateCategoryIcon(template.category)} size={16} />
          </span>
          <h3 className="t-h4 !mb-0 truncate flex-1">{template.displayName}</h3>
        </div>

        <p className="t-sm text-muted-foreground line-clamp-2 flex-1">
          {template.description}
        </p>

        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            icon="eye"
            className="flex-1"
            onClick={() => onPreview(template)}
          >
            {t("template.card.preview")}
          </Button>
          {canApply && (
            <Button
              variant={isSelected ? "secondary" : "primary"}
              size="sm"
              icon={isSelected ? "check" : undefined}
              className="flex-1"
              onClick={() => onSelect(template)}
              disabled={disabled || isSelected}
            >
              {isSelected ? t("template.card.active") : t("template.card.select")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
