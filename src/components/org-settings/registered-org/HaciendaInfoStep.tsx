import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon, Spinner, Badge } from "@/components/ui";
import {
  useAllCountries,
  useAllIdentifications,
  useTaxpayerInfo,
} from "@/hooks/useDataApi";
import {
  DOMESTIC_ID_CODES,
  formatIdentification,
  unmaskIdentification,
  expectedLengthForCode,
  isIdentificationLengthValid,
} from "@/lib/identification";
import type { FiscalInfoFormState } from "./types";
import type { TaxpayerResponse } from "@/services/data-api/dtos/consumer-identifications";

interface HaciendaInfoStepProps {
  form: FiscalInfoFormState;
  patch: (next: Partial<FiscalInfoFormState>) => void;
  /** Reset the entire form back to EMPTY_FISCAL_FORM. */
  onClearAll: () => void;
  /** Called once a valid Hacienda payload is returned so the parent can pre-fill nested state. */
  onHaciendaLookup?: (data: TaxpayerResponse) => void;
  compact?: boolean;
}

/**
 * Unified Hacienda info step — replaces the old Identification + Name + Situation trio.
 *
 * UX shape:
 *   1. Nationality (locked to "188"), ID type + ID number.
 *   2. As soon as the user types the right number of digits for the selected code,
 *      a debounced lookup against data-services is fired automatically. No blur required.
 *   3. On success the rest of the step renders as read-only labels (legal name, regime,
 *      situation, activities count) — the user can NOT edit these because they come
 *      from Hacienda.
 *   4. A "Clear info" ghost button (mirroring the clients drawer insert-mode button)
 *      resets the whole form back to empty.
 *
 * The step is "blocked" — the parent's stepper checks `canAdvance` and refuses to
 * progress when the lookup either has no regime, returns "No inscrito", or has zero
 * activities. The parent surfaces that as an error banner; this step shows an inline
 * hint too.
 */
export function HaciendaInfoStep({
  form,
  patch,
  onClearAll,
  onHaciendaLookup,
  compact = false,
}: HaciendaInfoStepProps) {
  const { t } = useLanguage();

  const { data: countries = [] } = useAllCountries({ status: "1" });
  const { data: idTypes = [] } = useAllIdentifications({ iso_code: "188" });
  const idOptions = (idTypes ?? []).filter((it) => DOMESTIC_ID_CODES.has(it.code));

  const validLength = isIdentificationLengthValid(form.idCode, form.idNumber);

  // ── Auto-fire lookup ──────────────────────────────────────────────────────
  // Debounce so the user can finish typing (and correct typos) before we hit
  // data-services. Re-runs whenever the raw (code, number) pair settles.
  const [debouncedNumber, setDebouncedNumber] = useState(form.idNumber);
  const lastLookupKey = useRef<string>("");

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedNumber(form.idNumber), 300);
    return () => window.clearTimeout(handle);
  }, [form.idNumber]);

  const shouldQuery =
    validLength &&
    debouncedNumber === form.idNumber &&
    `${form.idCode}:${form.idNumber}` !== lastLookupKey.current;

  const taxpayerQuery = useTaxpayerInfo(
    { iso_code: "188", identification: unmaskIdentification(form.idNumber) },
    { enabled: shouldQuery, retry: false },
  );

  useEffect(() => {
    if (taxpayerQuery.isSuccess && taxpayerQuery.data && onHaciendaLookup) {
      lastLookupKey.current = `${form.idCode}:${form.idNumber}`;
      onHaciendaLookup(taxpayerQuery.data);
    }
  }, [taxpayerQuery.isSuccess, taxpayerQuery.data, onHaciendaLookup, form.idCode, form.idNumber]);

  // ── Field handlers ────────────────────────────────────────────────────────
  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      patch({ idCode: e.target.value, idNumber: "" });
      lastLookupKey.current = "";
    },
    [patch],
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = unmaskIdentification(e.target.value);
      const { max } = expectedLengthForCode(form.idCode);
      patch({ idNumber: raw.slice(0, max) });
    },
    [patch, form.idCode],
  );

  // ── Derived gate state for the inline hint ────────────────────────────────
  const isUnregisteredRegime = useMemo(() => {
    const code = (form.regimeCode || "").trim();
    const desc = (form.regimeDescription || "").trim().toLowerCase();
    return code === "0" || desc.includes("no inscrito");
  }, [form.regimeCode, form.regimeDescription]);

  const hasInfo = !!form.name && !!form.regimeCode;
  const blocked = hasInfo && (isUnregisteredRegime || form.activities.length === 0);

  const helperText =
    form.idNumber.length > 0 && !validLength
      ? t("orgSettings.fiscalInfo.idInvalidLength")
      : "";

  return (
    <div className="space-y-5">
      {!compact && (
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="t-h3 mb-1">
              {t("orgSettings.fiscalInfo.haciendaInfo.title")}
            </h2>
            <p className="t-sm text-muted-foreground">
              {t("orgSettings.fiscalInfo.haciendaInfo.subtitle")}
            </p>
          </div>
          {(form.idNumber || hasInfo) && (
            <button
              type="button"
              onClick={onClearAll}
              className="btn btn-ghost btn-sm shrink-0"
            >
              <Icon name="trash" size={13} />
              {t("orgSettings.fiscalInfo.clearInfo")}
            </button>
          )}
        </header>
      )}

      {/* Nationality (locked) */}
      <div>
        <label className="pp-label" htmlFor="reg-org-nationality">
          {t("orgSettings.fiscalInfo.nationality")}
        </label>
        <select
          id="reg-org-nationality"
          className="pp-input w-full mt-1"
          value={form.nationality}
          disabled
          aria-disabled="true"
        >
          {countries.length === 0 && <option value="188">{t("orgSettings.fiscalInfo.costaRica")}</option>}
          {countries.map((c) => (
            <option key={c.iso_code} value={c.iso_code}>
              {c.spanish_name || c.name}
            </option>
          ))}
        </select>
        <p className="t-xs text-muted-foreground mt-1.5">
          {t("orgSettings.fiscalInfo.nationalityLocked")}
        </p>
      </div>

      {/* ID type + number */}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
        <div>
          <label className="pp-label" htmlFor="reg-org-id-type">
            {t("orgSettings.fiscalInfo.idType")}
          </label>
          <select
            id="reg-org-id-type"
            className="pp-input w-full mt-1"
            value={form.idCode}
            onChange={handleCodeChange}
          >
            {idOptions.map((it) => (
              <option key={it.code} value={it.code}>
                {it.code} — {it.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="pp-label" htmlFor="reg-org-id-number">
            {t("orgSettings.fiscalInfo.idNumber")}
          </label>
          <div className="relative">
            <input
              id="reg-org-id-number"
              className="pp-input w-full mt-1 pr-10"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatIdentification(form.idCode, form.idNumber)}
              onChange={handleNumberChange}
              placeholder={formatIdentification(
                form.idCode,
                "1".repeat(expectedLengthForCode(form.idCode).max),
              )}
            />
            {taxpayerQuery.isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground">
                <Spinner size={14} />
              </div>
            )}
          </div>
          {helperText && (
            <p className="t-xs text-warning mt-1.5">{helperText}</p>
          )}
        </div>
      </div>

      {/* Lookup result feedback */}
      {taxpayerQuery.isFetching && (
        <div className="flex items-center gap-2 t-sm text-muted-foreground">
          <Spinner size={14} />
          <span>{t("orgSettings.fiscalInfo.idLookupLoading")}</span>
        </div>
      )}
      {taxpayerQuery.isError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <Icon name="alertCircle" size={14} className="text-warning mt-0.5 flex-shrink-0" />
          <span className="t-sm text-foreground/80">
            {t("orgSettings.fiscalInfo.idLookupNotFound")}
          </span>
        </div>
      )}

      {/* Read-only Hacienda data — only after a successful lookup. */}
      {hasInfo && (
        <section className="card p-5 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="icon-pill icon-pill-primary-soft w-9 h-9">
              <Icon name="checkCircle" size={16} />
            </div>
            <div>
              <div className="t-sm font-semibold">
                {t("orgSettings.fiscalInfo.haciendaInfo.foundTitle")}
              </div>
              <div className="t-xs text-muted-foreground">
                {t("orgSettings.fiscalInfo.haciendaInfo.foundSubtitle")}
              </div>
            </div>
          </div>

          <ReadOnlyRow label={t("orgSettings.fiscalInfo.legalName")} value={form.name} />
          <ReadOnlyRow
            label={t("orgSettings.fiscalInfo.regime")}
            value={
              [form.regimeCode, form.regimeDescription]
                .filter(Boolean)
                .join(" — ") || "—"
            }
          />
          <ReadOnlyRow
            label={t("orgSettings.fiscalInfo.situation")}
            value={form.situationStatus || "—"}
            tail={
              form.isDebtor ? (
                <Badge variant="destructive">
                  {t("orgSettings.fiscalInfo.isDebtor")}
                </Badge>
              ) : form.isNonCompliant ? (
                <Badge variant="warning">
                  {t("orgSettings.fiscalInfo.isNonCompliant")}
                </Badge>
              ) : null
            }
          />
          {form.taxAdministration && (
            <ReadOnlyRow
              label={t("orgSettings.fiscalInfo.taxAdministration")}
              value={form.taxAdministration}
            />
          )}
          <ReadOnlyRow
            label={t("orgSettings.fiscalInfo.activitiesCount")}
            value={String(form.activities.length)}
          />
        </section>
      )}

      {/* Gate message — the user can't continue if the org isn't actually registered. */}
      {blocked && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
          <span className="t-sm text-foreground/80">
            {isUnregisteredRegime
              ? t("orgSettings.fiscalInfo.haciendaInfo.notRegistered")
              : t("orgSettings.fiscalInfo.haciendaInfo.noActivities")}
          </span>
        </div>
      )}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  tail,
}: {
  label: string;
  value: string;
  tail?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <span className="t-sm text-muted-foreground">{label}</span>
      <span className="t-sm font-medium text-right flex items-center gap-2">
        {value}
        {tail}
      </span>
    </div>
  );
}
