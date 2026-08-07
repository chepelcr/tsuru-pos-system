import React, { useEffect, useId, useRef, useState } from "react";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { Icon } from "./Icon";
import { OverlayPortal } from "./OverlayPortal";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  dismissible?: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
}

export function Drawer({
  open,
  onClose,
  closeLabel,
  dismissible = true,
  title,
  subtitle,
  icon,
  iconBg,
  iconColor,
  children,
  footer,
  width = 440,
}: DrawerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  const { isTopLayer } = useOverlayLayer({
    active: shouldRender,
    panelRef,
    dismissible: dismissible && !isClosing,
    onClose,
  });

  const handleClose = () => {
    if (dismissible && !isClosing && isTopLayer()) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-drawer">
      <div
        className={`absolute inset-0 bg-foreground/25 backdrop-blur-[1px] ${
          isClosing ? "drawer-overlay-exit" : "drawer-overlay-enter"
        }`}
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute top-0 right-0 h-[100dvh] bg-card border-l border-border flex flex-col shadow-modal outline-none ${
          isClosing ? "drawer-panel-exit" : "drawer-panel-enter"
        }`}
        style={{
          width: typeof width === "number" ? `min(${width}px, 100vw)` : width,
        }}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 border-b border-border flex items-center gap-3 flex-shrink-0 transition-opacity duration-100 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          {icon && (
            <div
              className="icon-pill w-9 h-9"
              style={{
                background: iconBg ?? "hsl(var(--primary) / 0.12)",
                color: iconColor ?? "hsl(var(--primary))",
              }}
            >
              <Icon name={icon} size={16} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div id={titleId} className="text-[17px] font-extrabold font-display tracking-[-0.01em]">
              {title}
            </div>
            {subtitle && (
              <div className="t-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
          {dismissible && (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={handleClose}
              type="button"
              aria-label={closeLabel}
              data-overlay-autofocus
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className={`flex-1 overflow-y-auto transition-opacity duration-100 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`border-t border-border flex-shrink-0 transition-opacity duration-100 ${
              isClosing ? "opacity-0" : "opacity-100"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
      </div>
    </OverlayPortal>
  );
}
