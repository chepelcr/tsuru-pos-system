import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, FormLabel, Input, Modal, Spinner } from "@/components/ui";
import { FormAlert } from "@/components/common/FormAlert";
import { useLanguage } from "@/contexts/LanguageContext";
import { ApiError } from "@/lib/api";
import {
  useConsecutiveAdjustments,
  useInitializeConsecutive,
  useUpdateConsecutive,
} from "@/hooks/useConsecutives";
import { MAX_CONSECUTIVE_NUMBER, formatDocumentConsecutive } from "@/types/consecutive";

/**
 * What is being edited. `consecutiveId` is absent when the terminal has never
 * issued this document type — saving then CREATES the counter at the chosen
 * number (`documentTypeId` is required for that).
 */
export interface ConsecutiveEditTarget {
  consecutiveId?: string;
  terminalId: string;
  documentTypeId?: number;
  documentTypeCode: string;
  documentTypeLabel: string;
  branchCode: number;
  terminalCode: number;
  terminalName: string;
  /** Last number already issued (0 when the counter does not exist yet). */
  currentNumber: number;
}

interface ConsecutiveEditDrawerProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  target: ConsecutiveEditTarget | null;
}

const MIN_REASON = 3;

/**
 * Manual correction of a document consecutive (TSR-327).
 *
 * Two steps, because this is the one edit in the POS that can make Hacienda
 * reject every following document: the form, then a confirmation screen that
 * spells out the old and new values and the exact next consecutive, and needs
 * an explicit acknowledgement. The counter can only be RAISED (the server
 * enforces it too, under the allocator's row lock, and answers 409 if a sale
 * moved the counter in the meantime).
 */
export function ConsecutiveEditDrawer({ open, onClose, orgId, target }: ConsecutiveEditDrawerProps) {
  const { t, language } = useLanguage();
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const update = useUpdateConsecutive(orgId);
  const initialize = useInitializeConsecutive(orgId);
  const adjustments = useConsecutiveAdjustments(orgId, target?.consecutiveId, { enabled: open });
  const saving = update.isPending || initialize.isPending;

  // Fresh form every time the drawer opens on a target.
  useEffect(() => {
    if (!open) return;
    setValue("");
    setReason("");
    setConfirming(false);
    setAcknowledged(false);
    setServerError(null);
  }, [open, target?.consecutiveId, target?.documentTypeCode, target?.terminalId]);

  const current = target?.currentNumber ?? 0;
  const parsed = /^\d{1,10}$/.test(value.trim()) ? Number(value.trim()) : NaN;

  const validationError = useMemo(() => {
    if (!value.trim()) return null;
    if (!Number.isFinite(parsed)) return t("consecutives.edit.errorDigits");
    if (parsed > MAX_CONSECUTIVE_NUMBER) return t("consecutives.edit.errorDigits");
    if (parsed <= current) return t("consecutives.edit.errorNotRaised", { current: String(current) });
    return null;
  }, [value, parsed, current, t]);

  const canReview =
    !!target && Number.isFinite(parsed) && !validationError && reason.trim().length >= MIN_REASON;

  const format = (n: number) =>
    target
      ? formatDocumentConsecutive(target.branchCode, target.terminalCode, target.documentTypeCode, n)
      : "";

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleString(language === "en" ? "en-US" : "es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleConfirm = async () => {
    if (!target || !canReview) return;
    setServerError(null);
    try {
      if (target.consecutiveId) {
        await update.mutateAsync({
          consecutiveId: target.consecutiveId,
          currentNumber: parsed,
          reason: reason.trim(),
        });
      } else if (target.documentTypeId !== undefined) {
        await initialize.mutateAsync({
          terminalId: target.terminalId,
          documentTypeId: target.documentTypeId,
          initialNumber: parsed,
          reason: reason.trim(),
        });
      }
      setConfirming(false);
      onClose();
    } catch (err) {
      setConfirming(false);
      setAcknowledged(false);
      setServerError(
        err instanceof ApiError && err.status === 409
          ? t("consecutives.edit.errorConflict")
          : err instanceof ApiError && err.status === 403
            ? t("consecutives.edit.errorForbidden")
            : (err as Error)?.message || t("consecutives.edit.errorGeneric"),
      );
    }
  };

  return (
    <>
      <Drawer
        closeLabel={t("common.close")}
        open={open}
        onClose={onClose}
        dismissible={!saving}
        title={t("consecutives.edit.title")}
        subtitle={target ? `${target.documentTypeLabel} · ${target.terminalName}` : undefined}
        icon="hash"
        footer={
          <div className="flex gap-2.5 px-6 py-4 justify-end">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canReview || saving}
              onClick={() => { setAcknowledged(false); setConfirming(true); }}
            >
              {t("consecutives.edit.review")}
            </Button>
          </div>
        }
      >
        {target && (
          <div className="flex flex-col gap-5 px-6 py-5">
            <FormAlert level="info" message={t("consecutives.edit.warning")} />

            {serverError && <FormAlert level="destructive" message={serverError} />}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="t-xs text-muted-foreground">{t("consecutives.currentNumber")}</div>
                <div className="font-mono text-lg font-bold">{current}</div>
              </div>
              <div className="rounded-lg border border-border p-3 min-w-0">
                <div className="t-xs text-muted-foreground">{t("consecutives.nextConsecutive")}</div>
                <div className="font-mono text-[13px] font-semibold truncate" title={format(current + 1)}>
                  {format(current + 1)}
                </div>
              </div>
            </div>

            <div>
              <FormLabel htmlFor="consecutive-new-number" required>
                {t("consecutives.edit.newNumber")}
              </FormLabel>
              <Input
                id="consecutive-new-number"
                inputMode="numeric"
                autoComplete="off"
                value={value}
                maxLength={10}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                placeholder={String(current + 1)}
              />
              <p className={`t-xs mt-1 ${validationError ? "text-destructive" : "text-muted-foreground"}`}>
                {validationError ?? t("consecutives.edit.newNumberHint")}
              </p>
            </div>

            <div>
              <FormLabel htmlFor="consecutive-reason" required>
                {t("consecutives.edit.reason")}
              </FormLabel>
              <textarea
                id="consecutive-reason"
                className="pp-input w-full min-h-[90px] resize-none"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("consecutives.edit.reasonPlaceholder")}
              />
            </div>

            {target.consecutiveId && (
              <div>
                <div className="t-label mb-2">{t("consecutives.edit.history")}</div>
                {adjustments.isLoading ? (
                  <Spinner size={18} />
                ) : (adjustments.data?.data ?? []).length === 0 ? (
                  <p className="t-xs text-muted-foreground">{t("consecutives.edit.noHistory")}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {adjustments.data!.data.map((a) => (
                      <li key={a.adjustment_id} className="rounded-md bg-muted/50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px] font-semibold">
                            {a.previous_number ?? "—"} → {a.new_number}
                          </span>
                          <span className="t-xs text-muted-foreground">{dateFmt(a.changed_on)}</span>
                        </div>
                        <div className="t-xs text-muted-foreground mt-0.5 break-words">{a.reason}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirmation screen — the sensitive step. */}
      <Modal
        open={confirming && !!target}
        onClose={() => { if (!saving) setConfirming(false); }}
        variant="warning"
        icon="alertTri"
        title={t("consecutives.confirm.title")}
        description={t("consecutives.confirm.description")}
        cancel={{ label: t("common.back"), onClick: () => setConfirming(false), disabled: saving }}
        confirm={{
          label: t("consecutives.confirm.action"),
          onClick: handleConfirm,
          variant: "destructive",
          disabled: !acknowledged,
          loading: saving,
          loadingLabel: t("common.saving"),
        }}
      >
        {target && Number.isFinite(parsed) && (
          <div className="flex flex-col gap-3 text-left">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
              <dt className="text-muted-foreground">{t("consecutives.documentType")}</dt>
              <dd className="font-semibold">{target.documentTypeLabel}</dd>
              <dt className="text-muted-foreground">{t("consecutives.terminal")}</dt>
              <dd className="font-semibold">{target.terminalName} ({target.terminalCode})</dd>
              <dt className="text-muted-foreground">{t("consecutives.currentNumber")}</dt>
              <dd className="font-mono">{current}</dd>
              <dt className="text-muted-foreground">{t("consecutives.edit.newNumber")}</dt>
              <dd className="font-mono font-bold">{parsed}</dd>
              <dt className="text-muted-foreground">{t("consecutives.nextConsecutive")}</dt>
              <dd className="font-mono font-bold break-all">{format(parsed + 1)}</dd>
              <dt className="text-muted-foreground">{t("consecutives.edit.reason")}</dt>
              <dd className="break-words">{reason.trim()}</dd>
            </dl>
            <p className="t-xs text-muted-foreground">
              {t("consecutives.confirm.skipped", { count: String(parsed - current - 1) })}
            </p>
            <label className="flex items-start gap-2 cursor-pointer text-[13px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>{t("consecutives.confirm.acknowledge")}</span>
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
