import { useMemo, useState } from "react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useOrganization, type Invitation, type OrgMember } from "@/hooks/useOrganization";
import { useAssignMemberRole, useOrgRoles, usePermissions } from "@/hooks/useRbac";
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
  user?: { firstName?: string; lastName?: string; email?: string };
}): string {
  const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(" ");
  return name || m.user?.email || "";
}

function roleBadgeVariant(roleName?: string) {
  switch (roleName) {
    case "owner":
      return "destructive" as const;
    case "admin":
      return "primary-soft" as const;
    default:
      return "secondary" as const;
  }
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
  const assignMemberRole = useAssignMemberRole();
  const { can } = usePermissions();
  const canUpdateMembers = can("admin", "update", "members");
  const canInviteMembers = can("admin", "invite", "members");
  const canRemoveMembers = can("admin", "remove", "members");

  // Same-org role rule (contract V3): only active, non-platform_admin roles
  // are assignable — filtered defensively here too.
  const roles = useMemo(
    () => allRoles.filter((r) => r.isActive && r.name !== "platform_admin"),
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
        await api.delete(orgPath(memberUserId, orgId, ""));
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
      confirmLabel: t("members.cancelInvite"),
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

  const roleLabel = (member: {
    role?: { displayName?: string; name?: string };
  }) =>
    member.role?.name
      ? rbacRoleLabel(t, member.role.name, member.role.displayName ?? member.role.name)
      : member.role?.displayName || t("members.roleMember");

  // O11 — assign a role to a member (server enforces same-org rule V3 +
  // last-owner protection). Controlled <Select> snaps back on cancel because
  // its value always derives from the members query.
  const handleChangeRole = (member: OrgMember, roleId: string) => {
    if (!userId || !orgId || roleId === member.roleId) return;
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const name = memberFullName(member) || member.user?.email || "";
    confirm({
      title: t("roles.members.changeRoleTitle"),
      message: t("roles.members.changeRoleConfirm", {
        role: rbacRoleLabel(t, role.name, role.displayName),
        name,
      }),
      variant: "default",
      icon: "shield",
      confirmLabel: t("roles.members.changeRole"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setRoleChangeError(null);
        try {
          await assignMemberRole.mutateAsync({
            userId,
            orgId,
            memberId: member.id,
            roleId,
          });
        } catch (err) {
          setRoleChangeError(
            err instanceof Error && err.message !== "Request failed"
              ? err.message
              : t("roles.members.changeRoleFailed")
          );
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
          title={term ? t("members.noResults") : t("members.noMembers")}
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
            const isCurrentUser = m.userId === userId;
            const isOwner = m.role?.name === "owner";
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
                {canUpdateMembers && !isCurrentUser ? (
                  <div className="w-44 flex-shrink-0">
                    <Select
                      inputSize="sm"
                      value={m.roleId}
                      aria-label={t("roles.members.changeRoleTitle")}
                      onChange={(e) => handleChangeRole(m, e.target.value)}
                    >
                      {/* Keep the current role visible even when it's no longer assignable (inactive role) */}
                      {!roles.some((r) => r.id === m.roleId) && (
                        <option value={m.roleId} disabled>
                          {roleLabel(m)}
                        </option>
                      )}
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {rbacRoleLabel(t, role.name, role.displayName)}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <Badge variant={roleBadgeVariant(m.role?.name)}>
                    {roleLabel(m)}
                  </Badge>
                )}
                {!isCurrentUser && !isOwner && canRemoveMembers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    aria-label={t("members.remove")}
                    onClick={() => handleRemoveMember(name || m.user?.email || "", m.userId)}
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
                      date: new Date(inv.expiresAt).toLocaleDateString(),
                    })}
                  </div>
                </div>
                <Badge variant="secondary">
                  {inv.role?.name
                    ? rbacRoleLabel(t, inv.role.name, inv.role.displayName ?? inv.role.name)
                    : inv.role?.displayName ?? inv.roleId}
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
                      {t("members.cancelInvite")}
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
          <FormField label={t("members.email")} required>
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

          <FormField label={t("members.role")} required>
            <Select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
            >
              <option value="" disabled>
                {t("members.selectRole")}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {rbacRoleLabel(t, role.name, role.displayName)}
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
