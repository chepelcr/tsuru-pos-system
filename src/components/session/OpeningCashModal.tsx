import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useCashSession, useOpenAssignment } from "@/hooks/useCashSession";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type { Session } from "@/types";
import { CashCounter, cashCountTotal, emptyCashCounts } from "./CashCounter";

/**
 * Blocking "count your opening cash" step (TSR-R01-05).
 *
 * Shown whenever the caller's active assignment has not been opened yet — on
 * login, on every re-login, and live when a manager assigns them (the AppSync
 * push refetches the assignment). It cannot be closed: the only way out is to
 * submit the count, because a till with an unknown starting balance cannot be
 * reconciled at closing.
 */
export function OpeningCashModal({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const { assignment, awaitingOpening } = useCashSession();
  const { data: branches = [] } = useBranches(orgId);
  const openAssignment = useOpenAssignment(orgId);
  const [counts, setCounts] = useState(emptyCashCounts);
  const [error, setError] = useState<string | null>(null);

  const sessionId = assignment?.session_id;
  const { data: session } = useQuery({
    queryKey: ["session", orgId, sessionId],
    enabled: awaitingOpening && !!sessionId,
    queryFn: () => crossAppApi.get<Session>(crossAppOrgPath(orgId, `/sessions/${sessionId}`)),
  });

  if (!awaitingOpening || !assignment) return null;

  const branch = branches.find((b) => b.branch_id === assignment.branch_id);
  const terminal = branch?.terminals?.find((x) => x.terminal_id === assignment.terminal_id);
  const total = cashCountTotal(counts);

  const submit = async () => {
    setError(null);
    try {
      await openAssignment.mutateAsync({ assignmentId: assignment.assignment_id, openingCash: total });
      setCounts(emptyCashCounts());
    } catch {
      setError(t("cashSession.openError"));
    }
  };

  return (
    <Modal
      open
      dismissible={false}
      onClose={() => undefined}
      icon="cash"
      title={t("cashSession.openTitle")}
      description={t("cashSession.openDescription")}
      confirm={{
        label: t("cashSession.openConfirm"),
        onClick: submit,
        loading: openAssignment.isPending,
        loadingLabel: t("cashSession.opening"),
      }}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 t-sm mb-4">
        <dt className="text-muted-foreground">{t("cashSession.session")}</dt>
        <dd className="font-semibold truncate">{session?.name ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("cashSession.branch")}</dt>
        <dd className="font-semibold truncate">{branch?.name ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("cashSession.terminal")}</dt>
        <dd className="font-semibold truncate">{terminal?.name ?? "—"}</dd>
      </dl>
      <CashCounter counts={counts} onChange={setCounts} disabled={openAssignment.isPending} />
      {error && <p role="alert" className="t-sm text-destructive mt-3">{error}</p>}
    </Modal>
  );
}
