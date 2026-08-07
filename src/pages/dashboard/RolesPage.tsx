import { useMemo, useState } from "react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useDeleteRole, useOrgRoles, usePermissions } from "@/hooks/useRbac";
import { RoleDrawerForm } from "@/components/roles/RoleDrawerForm";
import { Badge, Button, EmptyState, Icon } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import type { RoleDto } from "@/types/rbac";
import { roleLabel, roleDescription } from "@/lib/rbacI18n";

interface DrawerState {
  open: boolean;
  role: RoleDto | null;
  duplicateFrom: RoleDto | null;
  readOnly: boolean;
}

const DRAWER_CLOSED: DrawerState = {
  open: false,
  role: null,
  duplicateFrom: null,
  readOnly: false,
};

/**
 * Org-scoped roles management (Settings/Team): the org's custom roles plus
 * the default system role templates (read-only, duplicable as custom).
 * First consumer of the `usePermissions` gating helper.
 */
export default function RolesPage() {
  const { orgId } = useOrgContext();
  const { user } = useAuthContext();
  const userId = user?.userId;
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();

  const { can, isReady } = usePermissions();
  const rolesQuery = useOrgRoles(userId, orgId);
  const deleteRole = useDeleteRole();

  const [drawer, setDrawer] = useState<DrawerState>(DRAWER_CLOSED);
  const [actionError, setActionError] = useState<string | null>(null);

  usePageTitle([t("roles.title"), drawer.open && t("roles.form.permissions")]);

  // platform_admin is never org-assignable — hide it defensively even though
  // the backend excludes it from the templates list (contract V6).
  const visibleRoles = useMemo(
    () => (rolesQuery.data ?? []).filter((r) => r.name !== "platform_admin"),
    [rolesQuery.data]
  );
  const customRoles = useMemo(
    () => visibleRoles.filter((r) => !r.isSystem),
    [visibleRoles]
  );
  const systemRoles = useMemo(
    () => visibleRoles.filter((r) => r.isSystem),
    [visibleRoles]
  );

  const canRead = can("admin", "read", "roles");
  const canCreate = can("admin", "create", "roles");
  const canUpdate = can("admin", "update", "roles");
  const canDelete = can("admin", "delete", "roles");

  const openCreate = () => {
    setActionError(null);
    setDrawer({ open: true, role: null, duplicateFrom: null, readOnly: false });
  };
  const openEdit = (role: RoleDto) => {
    setActionError(null);
    setDrawer({ open: true, role, duplicateFrom: null, readOnly: false });
  };
  const openView = (role: RoleDto) => {
    setActionError(null);
    setDrawer({ open: true, role: null, duplicateFrom: role, readOnly: true });
  };
  const openDuplicate = (role: RoleDto) => {
    setActionError(null);
    setDrawer({ open: true, role: null, duplicateFrom: role, readOnly: false });
  };

  const handleDelete = (role: RoleDto) => {
    confirm({
      title: t("roles.deleteTitle"),
      message: t("roles.deleteConfirm", { name: role.displayName }),
      variant: "destructive",
      icon: "trash",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        if (!userId || !orgId) return;
        setActionError(null);
        try {
          await deleteRole.mutateAsync({ userId, orgId, roleId: role.id });
        } catch {
          // 409 when organization_members still reference the role (O8)
          setActionError(t("roles.deleteFailed"));
        }
      },
    });
  };

  // Route gating — first consumer of usePermissions. Only enforced once the
  // my-permissions query resolves (fail-open during the RBAC log rollout).
  if (isReady && !canRead) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        <EmptyState
          icon="lock"
          title={t("roles.noAccessTitle")}
          description={t("roles.noAccessDescription")}
        />
      </div>
    );
  }

  const renderRoleCard = (role: RoleDto) => {
    const isSystem = role.isSystem;
    // System templates render localized; custom org roles keep their own text
    const label = roleLabel(t, role.name, role.displayName);
    const descText = roleDescription(t, role.name, role.description);
    return (
      <div key={role.id} className="card card-hover p-4 flex items-center gap-3.5 flex-wrap">
        <div
          className={`icon-pill icon-pill-lg ${
            isSystem ? "icon-pill-muted" : "icon-pill-primary-soft"
          } w-10 h-10 flex-shrink-0`}
        >
          <Icon name="shield" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-body font-semibold text-foreground truncate">
              {label}
            </span>
            <Badge variant={isSystem ? "secondary" : "primary-soft"}>
              {isSystem ? t("roles.systemBadge") : t("roles.customBadge")}
            </Badge>
            {!role.isActive && (
              <Badge variant="warning">{t("common.inactive")}</Badge>
            )}
          </div>
          {descText && (
            <div className="t-sm text-muted-foreground truncate">
              {descText}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {isSystem ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon="eye"
                onClick={() => openView(role)}
              >
                {t("common.view")}
              </Button>
              {canCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  icon="copy"
                  onClick={() => openDuplicate(role)}
                >
                  {t("roles.duplicate")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={canUpdate ? "edit" : "eye"}
                onClick={() => (canUpdate ? openEdit(role) : openView(role))}
              >
                {canUpdate ? t("common.edit") : t("common.view")}
              </Button>
              {canCreate && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="copy"
                  aria-label={t("roles.duplicate")}
                  title={t("roles.duplicate")}
                  onClick={() => openDuplicate(role)}
                />
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  className="text-destructive"
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  onClick={() => handleDelete(role)}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSkeletons = (count: number) => (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skeleton-block w-10 h-10 rounded-full" />
          <div className="flex-1">
            <div className="skeleton-block h-4 w-40 mb-2" />
            <div className="skeleton-block-dim h-3 w-56" />
          </div>
          <div className="skeleton-block h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("roles.title")}</h1>
          <p className="t-body text-muted-foreground">{t("roles.subtitle")}</p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" icon="plus" onClick={openCreate}>
            {t("roles.new")}
          </Button>
        )}
      </div>

      {actionError && <ErrorBox message={actionError} className="mb-5" />}

      {rolesQuery.isError ? (
        <div className="flex flex-col items-start gap-3">
          <ErrorBox message={t("roles.loadError")} className="w-full" />
          <Button
            variant="outline"
            size="sm"
            icon="refresh"
            onClick={() => rolesQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <>
          {/* Custom org roles */}
          <div className="label-section mb-3 flex items-center gap-2">
            <Icon name="shield" size={13} />
            {t("roles.customSection")}
          </div>
          {rolesQuery.isLoading ? (
            renderSkeletons(2)
          ) : customRoles.length === 0 ? (
            <EmptyState
              icon="shield"
              title={t("roles.noCustomRoles")}
              description={t("roles.noCustomRolesDescription")}
              action={
                canCreate ? (
                  <Button variant="primary" size="sm" icon="plus" onClick={openCreate}>
                    {t("roles.new")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-3">{customRoles.map(renderRoleCard)}</div>
          )}

          {/* System role templates */}
          <div className="mt-10">
            <div className="label-section mb-3 flex items-center gap-2">
              <Icon name="lock" size={13} />
              {t("roles.systemSection")}
            </div>
            {rolesQuery.isLoading ? (
              renderSkeletons(3)
            ) : systemRoles.length === 0 ? (
              <div className="card card-muted p-5 text-center">
                <p className="t-sm text-muted-foreground">
                  {t("roles.noSystemRoles")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {systemRoles.map(renderRoleCard)}
              </div>
            )}
          </div>
        </>
      )}

      <RoleDrawerForm
        open={drawer.open}
        onClose={() => setDrawer(DRAWER_CLOSED)}
        role={drawer.role}
        duplicateFrom={drawer.duplicateFrom}
        readOnly={drawer.readOnly}
        onDuplicate={
          drawer.readOnly && drawer.duplicateFrom
            ? () =>
                setDrawer((cur) => ({
                  ...cur,
                  readOnly: false,
                }))
            : undefined
        }
      />

      <ConfirmModal />
    </div>
  );
}
