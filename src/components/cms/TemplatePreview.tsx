import { useId, useRef } from "react";
import { Icon, Button } from "@/components/ui";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { usePermissions } from "@/hooks/useRbac";
import { localizeTemplate } from "./localizeTemplate";
import { templateCategoryIcon } from "./templateCategory";
import { TemplateThumbnail } from "./TemplateThumbnail";
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
  return `https://${name}.examples.tsuru.jcampos.dev`;
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
  const { t, language } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isTopLayer } = useOverlayLayer({ active: open && !!template, panelRef, dismissible: true, onClose });
  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can } = usePermissions();
  const canApply = can("storefront", "update", "templates");

  if (!open || !template) return null;
  const copy = localizeTemplate(template, language);
  // The template's own features when it lists them; the generic list otherwise.
  const features = copy.features.length ? copy.features : FEATURE_KEYS.map((key) => t(key));

  return (
    <OverlayPortal>
    <div
      className="fixed inset-0 z-drawer-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
      onClick={() => { if (isTopLayer()) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-[560px] max-h-[90dvh] overflow-y-auto bg-card border border-border rounded-xl shadow-modal fade-up outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <span className="icon-pill icon-pill-lg icon-pill-primary-soft w-11 h-11 flex-shrink-0">
            <Icon name={templateCategoryIcon(template.category)} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="t-h3 !mb-0.5 truncate">{copy.displayName}</h3>
            <p className="t-xs text-muted-foreground">{t("template.preview.title")}</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm flex-shrink-0"
            onClick={onClose}
            aria-label={t("common.cancel")}
            data-overlay-autofocus
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Thumbnail */}
          <div className="aspect-[16/9] rounded-lg bg-muted/40 border border-border flex items-center justify-center overflow-hidden">
            <TemplateThumbnail template={template} />
          </div>

          {/* About */}
          <div>
            <h4 className="label-section mb-1.5">{t("template.preview.about")}</h4>
            {copy.tagline && <p className="t-sm font-medium text-foreground mb-1">{copy.tagline}</p>}
            <p className="t-sm text-muted-foreground">{copy.description}</p>
          </div>

          {/* Live demo */}
          <div>
            <h4 className="label-section mb-1.5">{t("template.preview.liveDemo")}</h4>
            <a
              href={template.preview_url ?? demoUrl(template.name)}
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
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 t-sm text-muted-foreground">
                  <Icon name="check" size={15} className="text-success flex-shrink-0 mt-0.5" />
                  {feature}
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
          {canApply && (
            <Button
              variant="primary"
              size="sm"
              icon="check"
              onClick={() => onUse(template)}
              disabled={disabled || isSelected}
            >
              {isSelected ? t("template.card.active") : t("template.preview.useTemplate")}
            </Button>
          )}
        </div>
      </div>
    </div>
    </OverlayPortal>
  );
}
