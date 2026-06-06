import React, { useEffect } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

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
  const iconName = icon ?? variantDefaultIcon[variant];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-card border border-border rounded-xl shadow-modal p-6 fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`icon-pill icon-pill-lg mx-auto mb-4 w-14 h-14 ${variantPillClass[variant]}`}>
          <Icon name={iconName} size={24} />
        </div>

        <h3 className={`t-h3 text-center ${description ? "mb-2" : ""}`}>{title}</h3>

        {description && (
          <p className={`t-sm text-center text-muted-foreground ${children ? "mb-4" : ""}`}>
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
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            )}
            {confirm && (
              <Button
                variant={confirm.variant ?? "primary"}
                onClick={confirm.onClick}
                disabled={confirm.disabled || confirm.loading}
              >
                {confirm.loading ? (confirm.loadingLabel ?? "Cargando…") : confirm.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
