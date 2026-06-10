import { Icon, Card, CardTitle, CardDescription, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface Branch {
  branch_id: string;
  name: string;
  code: number;
  type: string;
  status: number;
  terminals?: Terminal[];
}

interface Terminal {
  terminal_id: string;
  name: string;
  code: number;
  branch_id: string;
  status: number;
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

type Role = "cashier" | "supervisor";

interface AssignmentEntry {
  userId: string;
  role: Role;
  terminalId?: string;
}

interface StationAssignments {
  members: AssignmentEntry[];
}

interface StationAssignmentsProps {
  branches: Branch[];
  activeBranches: Set<string>;
  toggleBranch: (branchId: string) => void;
  selectedBranches: Branch[];
  assignments: Record<string, StationAssignments>;
  members: Member[];
  allAssignedUserIds: Set<string>;
  assigned: number;
  addMemberToStation: (branchId: string) => void;
  removeMemberFromStation: (branchId: string, index: number) => void;
  updateMember: (branchId: string, index: number, field: keyof AssignmentEntry, value: string) => void;
}

export default function StationAssignments({
  branches,
  activeBranches,
  toggleBranch,
  selectedBranches,
  assignments,
  members,
  allAssignedUserIds,
  assigned,
  addMemberToStation,
  removeMemberFromStation,
  updateMember,
}: StationAssignmentsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3.5">
      {/* Branch selection */}
      <Card className="!p-0">
        <div className="px-6 py-[18px] border-b border-border flex justify-between items-center">
          <div>
            <CardTitle>{t("session.selectStations")}</CardTitle>
            <CardDescription>
              {t("session.activeForSession", { n: String(activeBranches.size) })}
            </CardDescription>
          </div>
        </div>
        <div className="px-6 py-3 flex flex-col gap-2">
          {branches.length === 0 && (
            <p className="t-sm text-muted-foreground py-3">{t("session.noBranches")}</p>
          )}
          {branches.map((b) => (
            <button
              key={b.branch_id}
              onClick={() => toggleBranch(b.branch_id)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-md cursor-pointer transition-all text-left ${
                activeBranches.has(b.branch_id)
                  ? "border-2 border-primary bg-primary/[0.06]"
                  : "border border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="icon-pill icon-pill-muted">
                  <Icon name="store" size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold">{b.name}</div>
                  <div className="t-xs text-muted-foreground">{b.code} · {b.type}</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 border-2 ${
                  activeBranches.has(b.branch_id)
                    ? "border-primary bg-primary"
                    : "border-border bg-transparent"
                }`}
              >
                {activeBranches.has(b.branch_id) && (
                  <Icon name="check" size={12} className="text-white" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Assignments table */}
      {selectedBranches.length > 0 && (
        <Card className="!p-0">
          <div className="px-6 py-[18px] border-b border-border flex justify-between items-center">
            <div>
              <CardTitle>{t("session.assignments")}</CardTitle>
              <CardDescription>
                {t("session.assignedCount", { n: String(assigned), total: String(selectedBranches.length) })}
              </CardDescription>
            </div>
          </div>
          <div className="px-6">
            {selectedBranches.map((branch, i) => {
              const stationMembers = assignments[branch.branch_id]?.members || [];
              const branchTerminals = branch.terminals || [];

              return (
                <div
                  key={branch.branch_id}
                  className={`py-[18px] ${i < selectedBranches.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-pill icon-pill-lg">
                      <Icon name="store" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{branch.name}</div>
                      <div className="t-xs text-muted-foreground">
                        {branch.code} · {branchTerminals.length} terminales
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="plus"
                      disabled={members.filter((m) => !allAssignedUserIds.has(m.userId)).length === 0}
                      onClick={() => addMemberToStation(branch.branch_id)}
                    >
                      {t("session.addMember")}
                    </Button>
                  </div>

                  {stationMembers.length === 0 ? (
                    <div className="px-4 py-3 bg-muted/30 rounded-md text-center">
                      <span className="t-sm text-muted-foreground">
                        {t("session.noMembers")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {stationMembers.map((member, memberIndex) => {
                        const availableForSlot = members.filter(
                          (m) => m.userId === member.userId || !allAssignedUserIds.has(m.userId)
                        );

                        const branchHasSupervisor = stationMembers.some(
                          (m, i) => i !== memberIndex && m.role === "supervisor"
                        );

                        return (
                          <div
                            key={memberIndex}
                            className="grid gap-2.5 items-end"
                            style={{ gridTemplateColumns: "2fr 1.5fr 1fr auto" }}
                          >
                            <div>
                              <label className="label !text-[10px]">{t("session.member")}</label>
                              <select
                                className="input input-sm"
                                value={member.userId}
                                onChange={(e) =>
                                  updateMember(branch.branch_id, memberIndex, "userId", e.target.value)
                                }
                              >
                                <option value="">{t("session.select")}</option>
                                {availableForSlot.map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {[m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="label !text-[10px]">{t("session.terminal")}</label>
                              <select
                                className="input input-sm"
                                value={member.terminalId || ""}
                                onChange={(e) =>
                                  updateMember(branch.branch_id, memberIndex, "terminalId", e.target.value)
                                }
                              >
                                <option value="">{t("session.noTerminal")}</option>
                                {branchTerminals.map((terminal) => (
                                  <option key={terminal.terminal_id} value={terminal.terminal_id}>
                                    {terminal.name} ({terminal.code})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="label !text-[10px]">{t("session.role")}</label>
                              <select
                                className="input input-sm"
                                value={branchHasSupervisor ? "cashier" : member.role}
                                disabled={branchHasSupervisor}
                                onChange={(e) =>
                                  updateMember(branch.branch_id, memberIndex, "role", e.target.value)
                                }
                              >
                                <option value="cashier">{t("assignments.cashier")}</option>
                                {!branchHasSupervisor && (
                                  <option value="supervisor">{t("assignments.supervisor")}</option>
                                )}
                              </select>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              icon="trash"
                              onClick={() => removeMemberFromStation(branch.branch_id, memberIndex)}
                              className="!text-destructive"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
