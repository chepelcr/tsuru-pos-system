import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useAvailableMatrix,
  useCreateRole,
  useRolePermissions,
  useSetRolePermissions,
  useUpdateRole,
} from "@/hooks/useRbac";
import {
  PermissionMatrix,
  grantsFromPermissions,
  grantsToPermissions,
} from "@/components/roles/PermissionMatrix";
import { Button, Drawer, Input } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import type { RoleDto } from "@/types/rbac";
import { roleDescription, roleLabel } from "@/lib/rbacI18n";

/**
 * Derive the unique role identifier (`roles.name`) from the display name on
 * create — matches the system-role naming style (`platform_admin`, `staff`).
 */
function slugifyRoleName(value: string): string {
  const slug = value
    .normalize("NFD")
    // strip combining diacritics left over from NFD decomposition
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `role_${Date.now()}`;
}

interface RoleDrawerFormProps {
  open: boolean;
  onClose: () => void;
  /** Org role being edited. Null/undefined = create mode. */
  role?: RoleDto | null;
  /** Role whose permissions seed a NEW custom role ("duplicate as custom"). */
  duplicateFrom?: RoleDto | null;
  /** View-only mode (system role templates). */
  readOnly?: boolean;
  /** Shown in readOnly mode: switch to duplicate-as-custom for this role. */
  onDuplicate?: () => void;
}

/**
 * Role create/edit drawer — name/description + the org-filtered permission
 * matrix (O2). Saves the role (O6/O7) then bulk-replaces its permission set
 * (O10, `{ permissions: [...] }` envelope).
 */
export function RoleDrawerForm({
  open,
  onClose,
  role,
  duplicateFrom,
  readOnly = false,
  onDuplicate,
}: RoleDrawerFormProps) {
  const { user } = useAuthContext();
  const userId = user?.userId;
  const { orgId } = useOrgContext();
  const { t } = useLanguage();

  const sourceRole = role ?? duplicateFrom ?? null;

  const matrixQuery = useAvailableMatrix(userId, orgId, { enabled: open });
  const permsQuery = useRolePermissions(userId, orgId, sourceRole?.id, {
    enabled: open && !!sourceRole,
  });

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const setRolePermissions = useSetRolePermissions();

  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [grants, setGrants] = useState<Set<string>>(new Set());
  const [grantsInitialized, setGrantsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Keeps the created role across a failed permissions write so retrying the
  // save doesn't create a duplicate role.
  const [createdRole, setCreatedRole] = useState<RoleDto | null>(null);

  // Reset the form whenever the drawer opens for a (possibly different) role.
  useEffect(() => {
    if (!open) return;
    setDisplayName(
      role?.displayName ??
        (duplicateFrom
          ? t("roles.form.copyName", {
              name: roleLabel(t, duplicateFrom.name, duplicateFrom.displayName),
            })
          : "")
    );
    setDescription(role?.description ?? duplicateFrom?.description ?? "");
    setIsActive(role?.isActive ?? true);
    setGrants(new Set());
    setGrantsInitialized(!sourceRole); // blank role starts empty, no perms to load
    setError(null);
    setSaving(false);
    setCreatedRole(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role?.id, duplicateFrom?.id]);

  // Seed the matrix selection once both the matrix and grant rows resolve.
  useEffect(() => {
    if (!open || grantsInitialized) return;
    if (permsQuery.data && matrixQuery.data) {
      setGrants(grantsFromPermissions(permsQuery.data, matrixQuery.data));
      setGrantsInitialized(true);
    }
  }, [open, grantsInitialized, permsQuery.data, matrixQuery.data]);

  const isEdit = !!role || !!createdRole;

  const handleSave = async () => {
    if (readOnly || !userId || !orgId || saving) return;
    const name = displayName.trim();
    if (!name) {
      setError(t("roles.form.nameRequired"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let target = role ?? createdRole;
      if (!target) {
        // O6 — organizationId is forced from the path server-side.
        target = await createRole.mutateAsync({
          userId,
          orgId,
          name: slugifyRoleName(name),
          displayName: name,
          description: description.trim() || undefined,
        });
        setCreatedRole(target);
      } else {
        // O7 — `name` stays stable; only display fields + isActive change.
        await updateRole.mutateAsync({
          userId,
          orgId,
          roleId: target.id,
          displayName: name,
          description: description.trim() || undefined,
          isActive,
        });
      }
      // O10 — bulk replace; backend subset-validates against the org matrix.
      await setRolePermissions.mutateAsync({
        userId,
        orgId,
        roleId: target.id,
        permissions: grantsToPermissions(grants),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("roles.form.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const title = readOnly
    ? t("roles.form.viewTitle")
    : isEdit
      ? t("roles.form.editTitle")
      : t("roles.form.createTitle");

  const subtitle = readOnly
    ? sourceRole
      ? roleLabel(t, sourceRole.name, sourceRole.displayName)
      : undefined
    : duplicateFrom
      ? t("roles.form.duplicateSubtitle", {
          name: roleLabel(t, duplicateFrom.name, duplicateFrom.displayName),
        })
      : undefined;

  const matrixLoading =
    matrixQuery.isLoading || (!!sourceRole && !grantsInitialized && permsQuery.isLoading);
  const matrixError = matrixQuery.isError
    ? t("roles.matrix.loadError")
    : permsQuery.isError
      ? t("roles.matrix.loadError")
      : null;

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon="shield"
      width={560}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {readOnly ? t("common.close") : t("common.cancel")}
          </Button>
          {readOnly && onDuplicate && (
            <Button variant="primary" size="sm" icon="copy" onClick={onDuplicate}>
              {t("roles.duplicate")}
            </Button>
          )}
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              icon="check"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? t("common.saving")
                : isEdit
                  ? t("common.save")
                  : t("roles.form.create")}
            </Button>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-5">
        {readOnly && (
          <div className="card-muted border border-border rounded-md px-3 py-2.5">
            <span className="t-sm text-muted-foreground">
              {t("roles.form.systemNotice")}
            </span>
          </div>
        )}

        {readOnly && sourceRole && (
          <div>
            <div className="label-section mb-1">{t("common.description")}</div>
            <p className="t-sm text-muted-foreground">
              {roleDescription(t, sourceRole.name, sourceRole.description) ||
                t("roles.form.noDescription")}
            </p>
          </div>
        )}

        {!readOnly && (
          <>
            <FormField label={t("common.name")} required>
              <Input
                value={displayName}
                placeholder={t("roles.form.namePlaceholder")}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </FormField>

            <FormField label={t("common.description")}>
              <textarea
                className="input min-h-[72px] w-full resize-y"
                value={description}
                placeholder={t("roles.form.descriptionPlaceholder")}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            {isEdit && (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>
                  <span className="t-body font-semibold text-foreground block">
                    {t("roles.form.active")}
                  </span>
                  <span className="t-sm text-muted-foreground">
                    {t("roles.form.activeHelp")}
                  </span>
                </span>
              </label>
            )}
          </>
        )}

        <div>
          <div className="label-section mb-1">{t("roles.form.permissions")}</div>
          <p className="t-sm text-muted-foreground mb-3">
            {t("roles.form.permissionsHelp")}
          </p>
          <PermissionMatrix
            matrix={matrixQuery.data}
            isLoading={matrixLoading}
            error={matrixError}
            grants={grants}
            onChange={setGrants}
            readOnly={readOnly}
          />
        </div>

        {error && <ErrorBox message={error} />}
      </div>
    </Drawer>
  );
}
