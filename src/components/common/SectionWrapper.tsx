import { type LucideIcon, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionWrapperProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  visible?: boolean;
  badge?: string | number;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function SectionWrapper({
  title,
  icon: SectionIcon,
  children,
  isExpanded = true,
  onToggle,
  disabled = false,
  visible = true,
  badge,
  loading = false,
  error,
  className,
}: SectionWrapperProps) {
  const { t } = useLanguage();

  if (!visible) return null;

  return (
    <div
      className={`rounded-lg overflow-hidden transition-opacity duration-200 ${
        disabled ? "border border-border/40 opacity-55" : "border border-border opacity-100"
      } ${className ?? ""}`}
    >
      {/* Header */}
      <button
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : onToggle}
        className={`w-full flex items-center gap-2.5 px-3.5 py-[11px] bg-muted/35 border-0 text-left ${
          isExpanded ? "border-b border-border/60" : ""
        } ${disabled ? "cursor-not-allowed" : onToggle ? "cursor-pointer" : "cursor-default"}`}
      >
        <SectionIcon
          size={15}
          className={`flex-shrink-0 ${disabled ? "text-muted-foreground" : "text-primary"}`}
        />
        <span
          className={`flex-1 text-[13px] font-semibold tracking-[0.01em] ${
            disabled ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {title}
        </span>

        {badge !== undefined && (
          <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-sm px-1.5 py-px">
            {badge}
          </span>
        )}

        {disabled && (
          <span className="text-[10px] text-muted-foreground italic">
            {t("form.locked")}
          </span>
        )}

        {!disabled && onToggle && (
          isExpanded
            ? <EyeOff size={14} className="text-muted-foreground flex-shrink-0" />
            : <Eye size={14} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Content */}
      <div
        className="transition-[max-height] duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? 9999 : 0,
          overflow: isExpanded ? "visible" : "hidden",
        }}
      >
        <div className="px-4 py-3.5 flex flex-col gap-3">
          {loading && (
            <div className="text-center py-2 text-xs text-muted-foreground">
              {t("common.loading")}
            </div>
          )}
          {error && (
            <div className="px-2.5 py-2 bg-destructive/[0.08] rounded-md text-xs text-destructive">
              {error}
            </div>
          )}
          {!loading && children}
        </div>
      </div>
    </div>
  );
}
