import { useMemo, useState } from "react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useOrganization, type Invitation, type OrgMember } from "@/hooks/useOrganization";
import { useAddMemberRole, useOrgRoles, usePermissions, useRemoveMemberRole } from "@/hooks/useRbac";
import { api, orgPath } from "@/lib/api";
import {
  Icon,
  Button,
  Badge,
  Drawer,
  EmptyState,
  Pagination,
  Select,
} from "@/components/ui";
import { SearchInput } from "@/components/forms/SearchInput";
import { FormField } from "@/components/forms/FormField";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { roleLabel as rbacRoleLabel } from "@/lib/rbacI18n";

const PAGE_SIZE = 12;

function memberFullName(m: {
  user?: { first_name?: string; last_name?: string; email?: string };
}): string {
  const name = [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ");
  return name || m.user?.email || "";
}

export default function MembersPage() {
  const { orgId } = useOrgContext();
  const { user } = useAuthContext();
  const userId = user?.userId;
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();

  const {
    useOrgMembers,
    useOrgInvitations,
    inviteMember,
    cancelInvitation,
    resendInvitation,
  } = useOrganization();

  const { data: members = [], isLoading: membersLoading } = useOrgMembers(
    userId,
    orgId
  );
  const { data: invitations = [], isLoading: invitationsLoading } =
    useOrgInvitations(userId, orgId);

  // Org roles + system templates (O4) — drives both the invite Select and the
  // per-member role assignment dropdown.
  const { data: allRoles = [] } = useOrgRoles(userId, orgId);
  const addMemberRole = useAddMemberRole();
  const removeMemberRole = useRemoveMemberRole();
  const { can } = usePermissions();
  const canUpdateMembers = can("admin", "update", "members");
  const canInviteMembers = can("admin", "invite", "members");
  const canRemoveMembers = can("admin", "remove", "members");

  // Same-org role rule (contract V3): only active, non-platform_admin roles
  // are assignable — filtered defensively here too.
  const roles = useMemo(
    () => allRoles.filter((r) => r.is_active && r.name !== "platform_admin"),
    [allRoles]
  );
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

  const pendingInvitations = useMemo(
    () => invitations.filter((i) => i.status === "pending"),
    [invitations]
  );

  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  usePageTitle([t("members.title"), inviteOpen && t("members.invite")]);

  const filteredMembers = useMemo(() => {
    const tt = term.trim().toLowerCase();
    if (!tt) return members;
    return members.filter((m) => {
      const name = memberFullName(m).toLowerCase();
      const email = (m.user?.email ?? "").toLowerCase();
      return name.includes(tt) || email.includes(tt);
    });
  }, [members, term]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openInvite = () => {
    setInviteEmail("");
    setInviteRoleId(roles[0]?.id ?? "");
    setInviteError(null);
    setInviteOpen(true);
  };

  const handleSendInvite = async () => {
    if (!userId || !orgId) return;
    if (!inviteEmail.trim() || !inviteRoleId) {
      setInviteError(t("members.inviteValidation"));
      return;
    }
    setInviteError(null);
    try {
      await inviteMember.mutateAsync({
        userId,
        orgId,
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      });
      setInviteOpen(false);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : t("members.inviteFailed")
      );
    }
  };

  const handleRemoveMember = (memberName: string, memberUserId: string) => {
    confirm({
      title: t("members.removeTitle"),
      message: t("members.removeConfirm", { name: memberName }),
      variant: "destructive",
      icon: "trash",
      confirmLabel: t("members.remove"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        if (!userId || !orgId) return;
        // Member removal mirrors the dashboard TeamMembers page: DELETE the
        // member's membership on the markets-api. The member's own userId is
        // the path subject (route: /api/users/{userId}/memberships/organization/{orgId}).
        await api.delete(orgPath(memberUserId, orgId, ""), {
          removed_by: userId,
        });
      },
    });
  };

  const handleResend = (inv: Invitation) => {
    confirm({
      title: t("members.resendTitle"),
      message: t("members.resendConfirm", { email: inv.email }),
      variant: "default",
      icon: "refresh",
      confirmLabel: t("members.resend"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        if (!userId || !orgId) return;
        await resendInvitation.mutateAsync({
          userId,
          orgId,
          invitationId: inv.id,
        });
      },
    });
  };

  const handleCancelInvite = (inv: Invitation) => {
    confirm({
      title: t("members.cancelInviteTitle"),
      message: t("members.cancelInviteConfirm", { email: inv.email }),
      variant: "destructive",
      icon: "close",
      confirmLabel: t("common.cancel"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        if (!userId || !orgId) return;
        await cancelInvitation.mutateAsync({
          userId,
          orgId,
          invitationId: inv.id,
        });
      },
    });
  };

  // Assigned roles, active one first. Older payloads without `roles` fall back
  // to the single active role.
  const memberRoles = (m: OrgMember) =>
    m.roles?.length
      ? [...m.roles].sort((a, b) => Number(b.id === m.role_id) - Number(a.id === m.role_id))
      : m.role
        ? [{ ...m.role, is_system: false, is_active: true }]
        : [];

  const roleErrorMessage = (err: unknown) =>
    err instanceof Error && err.message !== "Request failed"
      ? err.message
      : t("roles.members.changeRoleFailed");

  // O17 — grant an extra role. The member's active role is unchanged; they
  // switch to it themselves from their profile.
  const handleAddRole = (member: OrgMember, roleId: string) => {
    if (!userId || !orgId || !roleId) return;
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const name = memberFullName(member) || member.user?.email || "";
    confirm({
      title: t("roles.members.addRoleTitle"),
      message: t("roles.members.addRoleConfirm", {
        role: rbacRoleLabel(t, role.name, role.display_name),
        name,
      }),
      variant: "default",
      icon: "shield",
      confirmLabel: t("roles.members.addRole"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setRoleChangeError(null);
        try {
          await addMemberRole.mutateAsync({ userId, orgId, memberId: member.id, roleId });
        } catch (err) {
          setRoleChangeError(roleErrorMessage(err));
        }
      },
    });
  };

  // O18 — take a role away. The server keeps at least one role per member and
  // the last owner's owner role, and moves the active role when needed.
  const handleRemoveRole = (member: OrgMember, role: { id: string; name: string; display_name: string }) => {
    if (!userId || !orgId) return;
    const name = memberFullName(member) || member.user?.email || "";
    confirm({
      title: t("roles.members.removeRoleTitle"),
      message: t("roles.members.removeRoleConfirm", {
        role: rbacRoleLabel(t, role.name, role.display_name),
        name,
      }),
      variant: "destructive",
      icon: "shield",
      confirmLabel: t("roles.members.removeRole"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setRoleChangeError(null);
        try {
          await removeMemberRole.mutateAsync({ userId, orgId, memberId: member.id, roleId: role.id });
        } catch (err) {
          setRoleChangeError(roleErrorMessage(err));
        }
      },
    });
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("members.title")}</h1>
          <p className="t-body text-muted-foreground">
            {members.length
              ? t("members.countSubtitle", { count: members.length })
              : t("members.subtitle")}
          </p>
        </div>
        {canInviteMembers && (
          <Button variant="primary" size="sm" icon="userPlus" onClick={openInvite}>
            {t("members.invite")}
          </Button>
        )}
      </div>

      {/* Search */}
      {(members.length > 0 || term) && (
        <div className="mb-5 max-w-sm">
          <SearchInput
            value={term}
            onChange={(next) => {
              setTerm(next);
              setPage(1);
            }}
            placeholder={t("members.searchPlaceholder")}
          />
        </div>
      )}

      {roleChangeError && (
        <ErrorBox message={roleChangeError} className="mb-5" />
      )}

      {/* Members list */}
      {membersLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="skeleton-block w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="skeleton-block h-4 w-40 mb-2" />
                <div className="skeleton-block-dim h-3 w-56" />
              </div>
              <div className="skeleton-block h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon="users"
          title={term ? t("common.noResults") : t("members.noMembers")}
          description={
            term ? t("members.tryOtherSearch") : t("members.noMembersDescription")
          }
          action={
            !term && canInviteMembers ? (
              <Button
                variant="primary"
                size="sm"
                icon="userPlus"
                onClick={openInvite}
              >
                {t("members.invite")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pagedMembers.map((m) => {
            const name = memberFullName(m);
            const isCurrentUser = m.user_id === userId;
            // Holding owner at all (not only as the active role) protects the
            // member from removal — same rule the server applies.
            const isOwner = memberRoles(m).some((r) => r.name === "owner");
            return (
              <div
                key={m.id}
                className="card card-hover p-4 flex items-center gap-3.5"
              >
                <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-10 h-10 flex-shrink-0">
                  <Icon name="user" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="t-body font-semibold text-foreground truncate">
                      {name || m.user?.email}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline">{t("members.you")}</Badge>
                    )}
                  </div>
                  <div className="t-sm text-muted-foreground truncate">
                    {m.user?.email}
                  </div>
                </div>
                {/* Roles — chips; editable only with admin:update:members and
                    never on yourself (you could remove your own access). */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[55%]">
                  {memberRoles(m).map((r) => {
                    const isActiveRole = r.id === m.role_id;
                    const editable = canUpdateMembers && !isCurrentUser && (m.roles?.length ?? 1) > 1;
                    return (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          isActiveRole ? "border-primary text-primary bg-primary/[0.06]" : "border-border text-muted-foreground"
                        }`}
                        title={isActiveRole ? t("roles.members.activeRole") : undefined}
                      >
                        {isActiveRole && <Icon name="check" size={11} />}
                        {rbacRoleLabel(t, r.name, r.display_name)}
                        {editable && (
                          <button
                            type="button"
                            className="ml-0.5 bg-transparent border-0 p-0 cursor-pointer text-current opacity-70 hover:opacity-100"
                            aria-label={t("roles.members.removeRoleAria", { role: rbacRoleLabel(t, r.name, r.display_name) })}
                            onClick={() => handleRemoveRole(m, r)}
                          >
                            <Icon name="close" size={11} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {canUpdateMembers && !isCurrentUser && roles.some((r) => !memberRoles(m).some((mr) => mr.id === r.id)) && (
                    <div className="w-36">
                      <Select
                        inputSize="sm"
                        value=""
                        aria-label={t("roles.members.addRole")}
                        onChange={(e) => handleAddRole(m, e.target.value)}
                      >
                        <option value="" disabled>
                          {t("roles.members.addRolePlaceholder")}
                        </option>
                        {roles
                          .filter((r) => !memberRoles(m).some((mr) => mr.id === r.id))
                          .map((role) => (
                            <option key={role.id} value={role.id}>
                              {rbacRoleLabel(t, role.name, role.display_name)}
                            </option>
                          ))}
                      </Select>
                    </div>
                  )}
                </div>
                {!isCurrentUser && !isOwner && canRemoveMembers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    aria-label={t("members.remove")}
                    onClick={() => handleRemoveMember(name || m.user?.email || "", m.user_id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredMembers.length > PAGE_SIZE && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalElements={filteredMembers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName={t("members.itemName")}
        />
      )}

      {/* Pending invitations */}
      <div className="mt-10">
        <div className="label-section mb-3 flex items-center gap-2">
          <Icon name="user" size={13} />
          {t("members.pendingInvitations")}
        </div>

        {invitationsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton-block h-4 w-48" />
                <div className="skeleton-block-dim h-6 w-16 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="card card-muted p-5 text-center">
            <p className="t-sm text-muted-foreground">
              {t("members.noPendingInvitations")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="card p-4 flex items-center gap-3.5 flex-wrap"
              >
                <div className="icon-pill icon-pill-lg icon-pill-warning w-10 h-10 flex-shrink-0">
                  <Icon name="clock" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="t-body font-semibold text-foreground truncate">
                    {inv.email}
                  </div>
                  <div className="t-sm text-muted-foreground">
                    {t("members.expiresOn", {
                      date: new Date(inv.expires_at).toLocaleDateString(),
                    })}
                  </div>
                </div>
                <Badge variant="secondary">
                  {inv.role?.name
                    ? rbacRoleLabel(t, inv.role.name, inv.role.display_name ?? inv.role.name)
                    : inv.role?.display_name ?? inv.role_id}
                </Badge>
                <Badge variant="warning">{t("members.statusPending")}</Badge>
                {canInviteMembers && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="refresh"
                      onClick={() => handleResend(inv)}
                    >
                      {t("members.resend")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="close"
                      className="text-destructive"
                      onClick={() => handleCancelInvite(inv)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Drawer */}
      <Drawer
        closeLabel={t("common.close")}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t("members.invite")}
        subtitle={t("members.inviteDescription")}
        icon="userPlus"
        width={460}
        footer={
          <div className="flex gap-2.5 px-6 py-4 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="user"
              onClick={handleSendInvite}
              disabled={inviteMember.isPending}
            >
              {inviteMember.isPending
                ? t("members.sending")
                : t("members.sendInvite")}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-5">
          <FormField label={t("common.email")} required>
            <input
              className="input w-full"
              type="email"
              placeholder={t("members.emailPlaceholder")}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendInvite();
              }}
            />
          </FormField>

          <FormField label={t("common.role")} required>
            <Select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
            >
              <option value="" disabled>
                {t("members.selectRole")}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {rbacRoleLabel(t, role.name, role.display_name)}
                </option>
              ))}
            </Select>
          </FormField>

          {inviteError && (
            <div className="card-muted border border-destructive/30 rounded-md px-3 py-2.5 flex items-start gap-2">
              <Icon
                name="alertCircle"
                size={15}
                className="text-destructive mt-0.5 flex-shrink-0"
              />
              <span className="t-sm text-destructive">{inviteError}</span>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmModal />
    </div>
  );
}
