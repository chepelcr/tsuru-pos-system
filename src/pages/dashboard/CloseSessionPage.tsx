import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button, Card, EmptyState, Icon, MoneyInput, Spinner } from "@/components/ui";
import { CashCounter, cashCountTotal, emptyCashCounts } from "@/components/session/CashCounter";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useBranches } from "@/hooks/useBranches";
import { useCashSession, useClosingPreview, useCloseAssignment } from "@/hooks/useCashSession";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { closingRows, declaredByCode, sumRows } from "@/lib/cashClosing";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_CODES, PAYMENT_METHOD_ICON, PAYMENT_METHOD_LABEL_KEY } from "@/lib/paymentMethods";
import { PaymentMethodCode } from "@/lib/enums/hacienda";
import { ROUTES } from "@/routePaths";

const CASH = PaymentMethodCode.CASH;

/** Signed difference, coloured: a shortfall is destructive, a surplus a warning. */
function Difference({ value }: { value: number }) {
  const tone = value === 0 ? "text-success" : value < 0 ? "text-destructive" : "text-warning";
  return <span className={`font-mono font-semibold ${tone}`}>{value > 0 ? "+" : ""}{formatMoney(value)}</span>;
}

/**
 * Close the caller's own cash assignment (TSR-R01-05): count the drawer, state
 * what each other payment method took, compare with what the system recorded,
 * and end the assignment. The session ends with its last assignment.
 */
export default function CloseSessionPage() {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const [, navigate] = useLocation();
  const { add } = useNotifications();
  const { assignment, isOpen, isLoading } = useCashSession();
  const { data: branches = [] } = useBranches(orgId);
  const preview = useClosingPreview(orgId, isOpen ? assignment?.assignment_id : undefined);
  const closeAssignment = useCloseAssignment(orgId);
  const { confirm, confirmModal } = useConfirmModal();
  usePageTitle([t("cashSession.closeTitle")]);

  const [counts, setCounts] = useState(emptyCashCounts);
  const [others, setOthers] = useState<Record<string, string>>({});
  const [extraCodes, setExtraCodes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expected = preview.data?.expected ?? {};
  const cashCounted = cashCountTotal(counts);
  const declared = useMemo(() => declaredByCode(cashCounted, others), [cashCounted, others]);
  const rows = useMemo(() => closingRows(expected, declared), [expected, declared]);
  const nonCashCodes = PAYMENT_METHOD_CODES.filter(
    (code) => code !== CASH && (code in expected || extraCodes.includes(code)),
  );
  const addableCodes = PAYMENT_METHOD_CODES.filter((code) => code !== CASH && !nonCashCodes.includes(code));

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (!isOpen || !assignment) {
    return (
      <div className="px-6 pt-6 pb-10 max-w-[900px] mx-auto">
        <EmptyState
          icon="lock"
          title={t("cashSession.noOpenTitle")}
          description={t("cashSession.noOpenDescription")}
          action={<Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>{t("cashSession.backToPanel")}</Button>}
        />
      </div>
    );
  }

  const branch = branches.find((b) => b.branch_id === assignment.branch_id);
  const terminal = branch?.terminals?.find((x) => x.terminal_id === assignment.terminal_id);
  const totalDifference = sumRows(rows, "difference");

  const submit = () =>
    confirm({
      title: t("cashSession.confirmTitle"),
      message: t("cashSession.confirmMessage", { difference: formatMoney(totalDifference) }),
      variant: totalDifference === 0 ? "success" : "warning",
      confirmLabel: t("cashSession.closeConfirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setError(null);
        try {
          await closeAssignment.mutateAsync({
            assignment_id: assignment.assignment_id,
            declared,
            notes: notes.trim() || undefined,
          });
          add({ source: "fe", level: "info", titleKey: "cashSession.closedTitle", bodyKey: "cashSession.closedBody" });
          navigate(ROUTES.DASHBOARD);
        } catch {
          setError(t("cashSession.closeError"));
        }
      },
    });

  return (
    <div className="px-6 pt-6 pb-10 max-w-[900px] mx-auto">
      <div className="mb-5">
        <h1 className="t-h1 mb-1.5">{t("cashSession.closeTitle")}</h1>
        <p className="t-body text-muted-foreground">
          {[branch?.name, terminal?.name].filter(Boolean).join(" · ")}
          {assignment.opened_at && ` · ${t("cashSession.openedAt", { time: new Date(assignment.opened_at).toLocaleString() })}`}
        </p>
      </div>

      {preview.isError && (
        <p role="alert" className="t-sm text-destructive mb-4">{t("cashSession.previewError")}</p>
      )}

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name={PAYMENT_METHOD_ICON[CASH]} size={18} />
          <h2 className="t-h3 !mb-0">{t(PAYMENT_METHOD_LABEL_KEY[CASH])}</h2>
        </div>
        <p className="t-sm text-muted-foreground mb-4">
          {t("cashSession.drawerHint", { opening: formatMoney(preview.data?.opening_cash ?? assignment.opening_cash ?? 0) })}
        </p>
        <CashCounter counts={counts} onChange={setCounts} disabled={closeAssignment.isPending} />
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="t-h3 mb-1">{t("cashSession.otherMethods")}</h2>
        <p className="t-sm text-muted-foreground mb-4">{t("cashSession.otherMethodsHint")}</p>
        <div className="space-y-3">
          {nonCashCodes.map((code) => (
            <div key={code} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_180px_180px] items-center gap-3">
              <label htmlFor={`declared-${code}`} className="flex items-center gap-2 t-sm font-semibold">
                <Icon name={PAYMENT_METHOD_ICON[code]} size={16} />
                {t(PAYMENT_METHOD_LABEL_KEY[code])}
              </label>
              <span className="t-xs text-muted-foreground sm:text-right">
                {t("cashSession.expected")}: <span className="font-mono">{formatMoney(expected[code] ?? 0)}</span>
              </span>
              <MoneyInput
                id={`declared-${code}`}
                className="col-span-2 sm:col-span-1"
                value={others[code] ?? ""}
                disabled={closeAssignment.isPending}
                onChange={(raw) => setOthers((cur) => ({ ...cur, [code]: raw }))}
              />
            </div>
          ))}
          {nonCashCodes.length === 0 && <p className="t-sm text-muted-foreground">{t("cashSession.noOtherMethods")}</p>}
        </div>
        {addableCodes.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="add-method" className="sr-only">{t("cashSession.addMethod")}</label>
            <select
              id="add-method"
              className="input input-sm max-w-[260px]"
              value=""
              onChange={(e) => e.target.value && setExtraCodes((cur) => [...cur, e.target.value])}
            >
              <option value="">{t("cashSession.addMethod")}</option>
              {addableCodes.map((code) => (
                <option key={code} value={code}>{t(PAYMENT_METHOD_LABEL_KEY[code])}</option>
              ))}
            </select>
          </div>
        )}
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="t-h3 mb-3">{t("cashSession.summary")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full t-sm">
            <thead>
              <tr>
                <th className="pp-th text-left">{t("cashSession.method")}</th>
                <th className="pp-th text-right">{t("cashSession.expected")}</th>
                <th className="pp-th text-right">{t("cashSession.declared")}</th>
                <th className="pp-th text-right">{t("cashSession.difference")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td className="pp-td">{t(PAYMENT_METHOD_LABEL_KEY[row.code])}</td>
                  <td className="pp-td text-right font-mono">{formatMoney(row.expected)}</td>
                  <td className="pp-td text-right font-mono">{formatMoney(row.declared)}</td>
                  <td className="pp-td text-right"><Difference value={row.difference} /></td>
                </tr>
              ))}
              <tr>
                <td className="pp-td font-bold">{t("common.total")}</td>
                <td className="pp-td text-right font-mono font-bold">{formatMoney(sumRows(rows, "expected"))}</td>
                <td className="pp-td text-right font-mono font-bold">{formatMoney(sumRows(rows, "declared"))}</td>
                <td className="pp-td text-right"><Difference value={totalDifference} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {preview.data && (
          <p className="t-xs text-muted-foreground mt-3">
            {t("cashSession.documentCount", { count: String(preview.data.document_count) })}
          </p>
        )}
      </Card>

      <Card className="p-5 mb-5">
        <label htmlFor="closing-notes" className="pp-label">{t("cashSession.notes")}</label>
        <textarea
          id="closing-notes"
          className="input w-full min-h-[80px]"
          maxLength={2000}
          value={notes}
          disabled={closeAssignment.isPending}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Card>

      {error && <p role="alert" className="t-sm text-destructive mb-3">{error}</p>}
      <div className="flex justify-end gap-2.5">
        <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)} disabled={closeAssignment.isPending}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" icon="lock" onClick={submit} disabled={closeAssignment.isPending || preview.isLoading}>
          {t("cashSession.closeConfirm")}
        </Button>
      </div>
      {confirmModal}
    </div>
  );
}
