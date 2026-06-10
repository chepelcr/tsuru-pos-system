import { useEffect } from "react";
import { Icon, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { templateCategoryIcon } from "./templateCategory";
import type { Template } from "@/types";

interface TemplatePreviewProps {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  /** Apply this template (re-clone storefront content). */
  onUse: (template: Template) => void;
  isSelected: boolean;
  disabled?: boolean;
}

/** Live demo URL for a deployed storefront template. */
function demoUrl(name: string): string {
  return `https://${name}-example.j-markets.jcampos.dev`;
}

const FEATURE_KEYS = [
  "template.preview.feature1",
  "template.preview.feature2",
  "template.preview.feature3",
  "template.preview.feature4",
  "template.preview.feature5",
] as const;

/**
 * Storefront-template preview modal. Re-hosted from the dashboard
 * `TemplatePreview` into a POS-styled overlay (same z-token + backdrop pattern
 * as `components/ui/Modal`, widened for the rich layout). Shows thumbnail +
 * description + a working "visit demo" link + a "what's included" list +
 * "Use template". Keeps the real deployed demo-URL builder.
 */
export function TemplatePreview({
  template,
  open,
  onClose,
  onUse,
  isSelected,
  disabled,
}: TemplatePreviewProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !template) return null;

  return (
    <div
      className="fixed inset-0 z-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-modal fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <span className="icon-pill icon-pill-lg icon-pill-primary-soft w-11 h-11 flex-shrink-0">
            <Icon name={templateCategoryIcon(template.category)} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="t-h3 !mb-0.5 truncate">{template.displayName}</h3>
            <p className="t-xs text-muted-foreground">{t("template.preview.title")}</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm flex-shrink-0"
            onClick={onClose}
            aria-label={t("common.cancel")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Thumbnail */}
          <div className="aspect-[16/9] rounded-lg bg-muted/40 border border-border flex items-center justify-center overflow-hidden">
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt={template.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Icon
                  name={templateCategoryIcon(template.category)}
                  size={30}
                  strokeWidth={1.5}
                  className="mx-auto mb-2"
                />
                <p className="t-xs">{t("template.preview.noPreview")}</p>
              </div>
            )}
          </div>

          {/* About */}
          <div>
            <h4 className="label-section mb-1.5">{t("template.preview.about")}</h4>
            <p className="t-sm text-muted-foreground">{template.description}</p>
          </div>

          {/* Live demo */}
          <div>
            <h4 className="label-section mb-1.5">{t("template.preview.liveDemo")}</h4>
            <a
              href={demoUrl(template.name)}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-outline btn-sm w-full"
            >
              <Icon name="eye" size={15} />
              {t("template.preview.visitDemo")}
            </a>
          </div>

          {/* What's included */}
          <div>
            <h4 className="label-section mb-2">{t("template.preview.whatsIncluded")}</h4>
            <ul className="flex flex-col gap-1.5">
              {FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2 t-sm text-muted-foreground">
                  <Icon name="check" size={15} className="text-success flex-shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-border justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={() => onUse(template)}
            disabled={disabled || isSelected}
          >
            {isSelected ? t("template.card.active") : t("template.preview.useTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
