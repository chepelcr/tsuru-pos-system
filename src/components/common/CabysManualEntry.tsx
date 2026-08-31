import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { CABYS_CODE_LENGTH, isValidCabysCode, normalizeCabysCode } from "@/lib/cabys";

interface CabysManualEntryProps {
  /** Receives a validated 13-digit code. */
  onSubmit: (code: string) => void;
  /**
   * True when this is the only option because there is no connection. Changes
   * the explanatory copy — offline it is a limitation, online it is a shortcut.
   */
  offline?: boolean;
  disabled?: boolean;
}

/**
 * Type a CABYS code by hand instead of searching for it.
 *
 * The CABYS catalog is a server search with no local mirror (it is far too
 * large to ship to a POS terminal), so offline the search box is dead weight.
 * A cashier who knows the code — which, for a shop with a fixed catalog, is
 * most of them — can still complete the line by typing it.
 *
 * What manual entry CANNOT do is derive the IVA rate: that comes back with the
 * search result. So the component says so out loud rather than letting the
 * line go out with whatever rate happened to be on it.
 */
export function CabysManualEntry({ onSubmit, offline, disabled }: CabysManualEntryProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");

  const valid = isValidCabysCode(code);
  const showLengthHint = code.length > 0 && !valid;

  const submit = () => {
    if (!valid || disabled) return;
    onSubmit(code);
    setCode("");
  };

  return (
    <div className="docs-fade-in">
      <FormLabel htmlFor="cabys-manual-code">{t("cabys.manualLabel")}</FormLabel>
      <div className="flex gap-1.5">
        <input
          id="cabys-manual-code"
          className="pp-input flex-1 font-mono tracking-[0.08em]"
          inputMode="numeric"
          autoComplete="off"
          maxLength={CABYS_CODE_LENGTH}
          placeholder={t("cabys.manualPlaceholder")}
          value={code}
          disabled={disabled}
          onChange={(e) => setCode(normalizeCabysCode(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm flex-shrink-0 !px-3"
          disabled={!valid || disabled}
          onClick={submit}
          aria-label={t("cabys.manualApply")}
        >
          <Check size={14} />
        </button>
      </div>

      <div className="text-[11px] text-muted-foreground mt-1">
        {showLengthHint
          ? t("cabys.manualLengthHint", { n: CABYS_CODE_LENGTH, current: code.length })
          : offline
            ? t("cabys.manualOfflineHelp")
            : t("cabys.manualHelp")}
      </div>

      <div className="flex items-start gap-1.5 mt-1.5">
        <AlertTriangle size={12} className="text-warning flex-shrink-0 mt-[2px]" />
        <span className="text-[11px] text-muted-foreground">{t("cabys.manualRateWarning")}</span>
      </div>
    </div>
  );
}
