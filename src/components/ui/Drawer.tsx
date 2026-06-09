import React, { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
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

  useEffect(() => {
    if (open && shouldRender) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, shouldRender]);

  const handleClose = () => {
    if (!isClosing) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-foreground/25 z-tooltip backdrop-blur-[1px] ${
          isClosing ? "drawer-overlay-exit" : "drawer-overlay-enter"
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed top-0 right-0 bottom-0 z-drawer bg-card border-l border-border flex flex-col shadow-modal ${
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
            <div className="text-[17px] font-extrabold font-display tracking-[-0.01em]">
              {title}
            </div>
            {subtitle && (
              <div className="t-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={handleClose}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
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
    </>
  );
}
