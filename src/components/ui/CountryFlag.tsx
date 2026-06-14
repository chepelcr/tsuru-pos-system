import * as Flags from "country-flag-icons/react/3x2";

type FlagComponent = React.ComponentType<{ title?: string; className?: string }>;
const FLAGS = Flags as unknown as Record<string, FlagComponent>;

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "CR" (case-insensitive). Falls back to a
   *  neutral placeholder block when missing/unknown so layout never shifts. */
  code?: string | null;
  /** Tailwind sizing/shape — defaults to a small rounded flag. */
  className?: string;
  title?: string;
}

/**
 * Bundled SVG country flag (country-flag-icons) — NOT an emoji, so it renders
 * identically across platforms (incl. Windows) and works offline. Keyed by the
 * country `iso` alpha-2 field from the locations data-api.
 */
export function CountryFlag({ code, className = "w-5 h-auto rounded-[2px]", title }: CountryFlagProps) {
  const key = (code ?? "").trim().toUpperCase();
  const Flag = key ? FLAGS[key] : undefined;
  if (!Flag) {
    return <span className={`inline-block bg-muted ${className}`} aria-hidden="true" />;
  }
  return <Flag title={title} className={className} />;
}
