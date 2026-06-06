import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Body content — typically a stack of filter fields. */
  children: ReactNode;
  /** Called when the user clicks "Apply". The shell does NOT auto-close; the page closes after applying state. */
  onApply: () => void;
  /** Optional clear action — when omitted the clear button is hidden. */
  onClear?: () => void;
  /** Override the apply button label. Defaults to `common.applyFilters`. */
  applyLabel?: string;
  /** Override the clear button label. Defaults to `common.clear`. */
  clearLabel?: string;
  /** Max card width. Defaults to `max-w-sm`. */
  maxWidthClass?: string;
}

/**
 * Centered modal shell for advanced/complex filter UIs. Portals to
 * `document.body` so its `position: fixed` backdrop spans the viewport
 * regardless of transformed/contained ancestors in the dashboard shell,
 * locks body scroll while open, animates in & out, and handles ESC +
 * backdrop dismissal.
 */
export function FiltersModal({
  open,
  onClose,
  title,
  children,
  onApply,
  onClear,
  applyLabel,
  clearLabel,
  maxWidthClass = "max-w-sm",
}: FiltersModalProps) {
  const { t } = useLanguage();
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
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-modal bg-foreground/50 flex items-center justify-center p-4 ${
        isClosing ? "modal-overlay-exit" : "modal-overlay-enter"
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[calc(100vh-2rem)] rounded-xl bg-card border border-border shadow-modal overflow-hidden flex flex-col ${
          isClosing ? "modal-panel-exit" : "modal-panel-enter"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-display font-bold text-[16px]">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0">
          {onClear && (
            <button
              onClick={onClear}
              className="flex-[0_0_80px] h-10 rounded-md border border-border text-[12px] text-muted-foreground hover:bg-muted"
            >
              {clearLabel ?? t("common.clear")}
            </button>
          )}
          <button
            onClick={onApply}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold"
          >
            {applyLabel ?? t("common.applyFilters")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
