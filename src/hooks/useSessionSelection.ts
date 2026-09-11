import { useEffect, useMemo, useRef } from "react";
import { useAssignment } from "@/hooks/useAssignment";
import { useBranches } from "@/hooks/useBranches";
import { useSessionContext } from "@/store/sessionContext";
import type { Branch, Terminal } from "@/types/branch";

export interface UseSessionSelectionResult {
  branches: Branch[];
  terminals: Terminal[];
  branch: Branch | null;
  terminal: Terminal | null;
  selectBranch: (branchId: string) => void;
  selectTerminal: (terminalId: string) => void;
  /** The org has no branch at all — nothing can be selected until one exists. */
  needsBranch: boolean;
  /** The selected branch has no terminal — one has to be created. */
  needsTerminal: boolean;
  /** True once the branch list resolved; auto-selection is meaningless before. */
  isReady: boolean;
  isLoading: boolean;
}

/**
 * Resolve the branch and terminal a document is issued from.
 *
 * The POS used to gate its entire workspace behind a full-screen "start your
 * shift" form: no sale, no document, not even the product grid, until a station
 * and a terminal had been picked by hand — every time the persisted store was
 * empty. That is a question with an obvious answer in almost every case, asked
 * at the worst possible moment. It is now answered automatically, and only
 * *shown* where it actually matters: on the document being issued, in the
 * checkout drawer's own card.
 *
 * Precedence, highest first:
 *
 *  1. **The user's session assignment.** If they were assigned to a session,
 *     that session's branch and terminal ARE the answer — a cashier assigned to
 *     caja 2 of the Heredia branch must not be billing from anywhere else.
 *  2. **What is already selected**, as long as it still exists. Re-resolving on
 *     every mount would fight the user's own choice in the checkout card.
 *  3. **The first available branch and its first terminal.** For the single-
 *     branch, single-terminal org — which is most of them — this is the only
 *     possible answer, so asking for it was pure ceremony.
 *
 * When there is genuinely nothing to pick (no branch, or a branch with no
 * terminal), `needsBranch` / `needsTerminal` say so and the card asks the user
 * to create one.
 */
export function useSessionSelection(orgId?: string): UseSessionSelectionResult {
  const { data: branches = [], isLoading, isSuccess } = useBranches(orgId);
  const { data: assignment } = useAssignment();
  const session = useSessionContext();
  const setSession = useSessionContext((s) => s.setSession);
  // The assignment whose branch/terminal has already been applied. See the
  // auto-selection effect below for why this is a ref and not a comparison.
  const appliedAssignmentRef = useRef<string | null>(null);

  const branch = useMemo(
    () => branches.find((b) => b.branch_id === session.branch_id) ?? null,
    [branches, session.branch_id],
  );
  const terminals = useMemo(() => branch?.terminals ?? [], [branch]);
  const terminal = useMemo(
    () => terminals.find((t) => t.terminal_id === session.terminal_id) ?? null,
    [terminals, session.terminal_id],
  );

  const apply = (nextBranch: Branch, nextTerminal: Terminal) => {
    setSession({
      branch_code: nextBranch.code,
      terminal_code: nextTerminal.code,
      branch_name: nextBranch.name,
      terminal_name: nextTerminal.name,
      // sales-api validates the identifiers, not the Hacienda codes.
      branch_id: nextBranch.branch_id,
      terminal_id: nextTerminal.terminal_id,
    });
  };

  // ─── Auto-selection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSuccess || branches.length === 0) return;

    // 1. The assignment decides — ONCE per assignment.
    //
    //    Applied through a ref rather than on every reconciliation pass,
    //    because this hook also backs the checkout card's dropdowns. Re-running
    //    it unconditionally would snap an assigned cashier's selection back to
    //    their assigned till the instant they changed it, which reads as the
    //    dropdown refusing the choice. The assignment is the right DEFAULT, not
    //    a lock: a cashier covering another till for one document says so on
    //    that document.
    const assignmentId = assignment?.assignment_id ?? null;
    if (assignmentId && appliedAssignmentRef.current !== assignmentId) {
      const assigned = assignment?.branch_id
        ? branches.find((b) => b.branch_id === assignment.branch_id)
        : undefined;
      const assignedTerminal =
        (assignment?.terminal_id
          ? assigned?.terminals?.find((t) => t.terminal_id === assignment.terminal_id)
          : undefined) ?? assigned?.terminals?.[0];
      if (assigned && assignedTerminal) {
        appliedAssignmentRef.current = assignmentId;
        if (
          assigned.branch_id !== session.branch_id ||
          assignedTerminal.terminal_id !== session.terminal_id
        ) {
          apply(assigned, assignedTerminal);
        }
        return;
      }
    }

    // 2. Keep a still-valid selection. Names are refreshed in case the branch
    //    was renamed since the store was persisted.
    const current = branches.find((b) => b.branch_id === session.branch_id);
    if (current) {
      const currentTerminal = current.terminals?.find(
        (t) => t.terminal_id === session.terminal_id,
      );
      if (currentTerminal) {
        if (
          current.name !== session.branch_name ||
          currentTerminal.name !== session.terminal_name ||
          current.code !== session.branch_code ||
          currentTerminal.code !== session.terminal_code
        ) {
          apply(current, currentTerminal);
        }
      }
      // A branch the user picked that has no terminal yet is left ALONE. It
      // would otherwise be snapped back to the first usable branch the moment
      // it was selected, which reads as the dropdown refusing the choice —
      // and it is a legitimate state: the card's answer to it is "create a
      // terminal here", not "pick somewhere else".
      return;
    }

    // 3. Fall back to the first branch that actually has a terminal, so a
    //    half-configured first branch does not strand an org that has a working
    //    second one.
    const firstUsable = branches.find((b) => (b.terminals?.length ?? 0) > 0);
    if (firstUsable) {
      apply(firstUsable, firstUsable.terminals![0]);
    }
    // `apply` and `session.*` are read, not depended on: this effect reconciles
    // the store and must not re-run for every write it makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, branches, assignment?.assignment_id, assignment?.branch_id, assignment?.terminal_id, session.branch_id, session.terminal_id]);

  const selectBranch = (branchId: string) => {
    const next = branches.find((b) => b.branch_id === branchId);
    if (!next) return;
    const nextTerminal = next.terminals?.[0];
    if (nextTerminal) {
      apply(next, nextTerminal);
      return;
    }
    // A branch with no terminal is still a legitimate selection — the card
    // renders the "create a terminal" prompt against it.
    setSession({
      branch_code: next.code,
      terminal_code: 0,
      branch_name: next.name,
      terminal_name: "",
      branch_id: next.branch_id,
      terminal_id: "",
    });
  };

  const selectTerminal = (terminalId: string) => {
    const next = terminals.find((t) => t.terminal_id === terminalId);
    if (!next || !branch) return;
    apply(branch, next);
  };

  return {
    branches,
    terminals,
    branch,
    terminal,
    selectBranch,
    selectTerminal,
    needsBranch: isSuccess && branches.length === 0,
    needsTerminal: !!branch && terminals.length === 0,
    isReady: isSuccess,
    isLoading,
  };
}
