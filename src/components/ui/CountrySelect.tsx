import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { CountryFlag } from "./CountryFlag";
import { useAllCountries } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";

interface CountrySelectProps {
  /** Selected country by ISO numeric code (e.g. "188" = Costa Rica). */
  value?: string | null;
  onChange: (isoCode: string) => void;
  /** Button label style: dial code ("+506") or full country name. List rows
   *  always show flag + name + dial code regardless. */
  display?: "dial" | "name";
  disabled?: boolean;
  /** Tailwind width for the trigger button. */
  className?: string;
  id?: string;
}

/**
 * Searchable country picker rendering bundled SVG flags (CountryFlag) — a native
 * <select> can't show images in its options, so this is a token-styled custom
 * combobox. Countries come from the locations data-api (useAllCountries); the
 * value is the ISO numeric `iso_code`, flags key off the alpha-2 `iso` field.
 */
export function CountrySelect({
  value,
  onChange,
  display = "name",
  disabled,
  className = "w-full",
  id,
}: CountrySelectProps) {
  const { t } = useLanguage();
  const { data: countries = [], isLoading } = useAllCountries({ status: "1" });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => countries.find((c) => c.iso_code === value),
    [countries, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) =>
      [c.spanish_name, c.name, c.phone_code, c.iso].some((f) => f?.toLowerCase().includes(q)),
    );
  }, [countries, query]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonLabel = selected
    ? display === "dial"
      ? selected.phone_code || selected.spanish_name || selected.name
      : selected.spanish_name || selected.name
    : isLoading
      ? t("common.loading")
      : t("location.selectCountry");

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        id={id}
        disabled={disabled || isLoading}
        onClick={() => setOpen((v) => !v)}
        className="pp-input w-full flex items-center gap-2 text-left disabled:opacity-60"
      >
        <CountryFlag code={selected?.iso} className="w-5 h-auto rounded-[2px] flex-shrink-0" />
        <span className="flex-1 truncate">{buttonLabel}</span>
        <Icon name="chevronDown" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-dropdown mt-1 w-full min-w-[240px] bg-card border border-border rounded-lg shadow-dropdown overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("location.searchCountry")}
              className="pp-input pp-input-sm w-full"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center t-sm text-muted-foreground">
                {t("common.noResults")}
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.iso_code}
                  type="button"
                  onClick={() => {
                    onChange(c.iso_code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/60 ${
                    c.iso_code === value ? "bg-primary/[0.06] text-primary" : "text-foreground"
                  }`}
                >
                  <CountryFlag code={c.iso} className="w-5 h-auto rounded-[2px] flex-shrink-0" />
                  <span className="flex-1 truncate">{c.spanish_name || c.name}</span>
                  {c.phone_code && (
                    <span className="t-xs text-muted-foreground flex-shrink-0">{c.phone_code}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
