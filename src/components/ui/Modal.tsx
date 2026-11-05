import React, { useId, useRef } from "react";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { OverlayPortal } from "./OverlayPortal";
import { useLanguage } from "@/contexts/LanguageContext";

type ModalVariant = "default" | "destructive" | "success" | "warning";

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: string;
  variant?: ModalVariant;
  confirm?: ModalAction;
  cancel?: ModalAction;
  children?: React.ReactNode;
}

const variantPillClass: Record<ModalVariant, string> = {
  default:     "bg-primary/[0.12] text-primary",
  destructive: "bg-destructive/[0.12] text-destructive",
  success:     "bg-success/[0.12] text-success",
  warning:     "bg-secondary/15 text-secondary",
};

const variantDefaultIcon: Record<ModalVariant, string> = {
  default: "info",
  destructive: "alertTri",
  success: "checkCircle",
  warning: "lock",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  variant = "default",
  confirm,
  cancel,
  children,
}: ModalProps) {
  const { t } = useLanguage();
  const iconName = icon ?? variantDefaultIcon[variant];
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const busy = !!confirm?.loading;
  const { isTopLayer } = useOverlayLayer({
    active: open,
    panelRef,
    dismissible: !busy,
    onClose,
  });

  if (!open) return null;

  return (
    <OverlayPortal>
    <div
      className="fixed inset-0 z-drawer-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
      onClick={() => { if (!busy && isTopLayer()) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        className="w-full max-w-[400px] max-h-[90dvh] overflow-y-auto bg-card border border-border rounded-xl shadow-modal p-6 fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`icon-pill icon-pill-lg shrink-0 w-11 h-11 ${variantPillClass[variant]}`} aria-hidden="true">
            <Icon name={iconName} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="t-h3 !mb-0">{title}</h3>
          </div>
          <Button type="button" variant="ghost" size="sm" icon="close" className="shrink-0" aria-label={t("common.close")} onClick={onClose} disabled={busy} />
        </div>

        {description && (
          <p className={`t-sm text-muted-foreground ${children ? "mb-4" : ""}`}>
            {description}
          </p>
        )}

        {children && <div className="mb-5">{children}</div>}

        {(confirm || cancel) && (
          <div className="grid grid-cols-2 gap-2 mt-5">
            {cancel ? (
              <Button variant={cancel.variant ?? "outline"} onClick={cancel.onClick} disabled={cancel.disabled}>
                {cancel.label}
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            )}
            {confirm && (
              <Button
                variant={confirm.variant ?? "primary"}
                onClick={confirm.onClick}
                disabled={confirm.disabled || confirm.loading}
                aria-busy={confirm.loading}
              >
                {confirm.loading ? (confirm.loadingLabel ?? t("common.loading")) : confirm.label}
                {confirm.loading && <Spinner size={14} className="text-current" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
    </OverlayPortal>
  );
}
