import { useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import type {
  AvailableMatrixDto,
  MatrixModule,
  PermissionGrantDto,
} from "@/types/rbac";

/** Internal grant key — one selected (module, submodule, action) cell. */
export function grantKey(
  moduleId: string,
  submoduleId: string,
  actionId: string
): string {
  return `${moduleId}|${submoduleId}|${actionId}`;
}

/**
 * Expand persisted grant rows (O9) into matrix cell keys.
 * Module-wide rows (`submoduleId: null`) expand to every submodule of the
 * module where the action is available — mirrors the backend's V4 expansion.
 * Grants outside the org's available matrix are dropped (stale rows).
 */
export function grantsFromPermissions(
  permissions: PermissionGrantDto[],
  matrix: AvailableMatrixDto
): Set<string> {
  const next = new Set<string>();
  for (const grant of permissions) {
    const module = matrix.modules.find((m) => m.id === grant.moduleId);
    if (!module) continue;
    const targets = grant.submoduleId
      ? module.submodules.filter((s) => s.id === grant.submoduleId)
      : module.submodules;
    for (const sub of targets) {
      if (sub.actions.some((a) => a.id === grant.actionId)) {
        next.add(grantKey(module.id, sub.id, grant.actionId));
      }
    }
  }
  return next;
}

/** Serialize selected cells back to O10 grant rows (explicit submoduleIds). */
export function grantsToPermissions(grants: Set<string>): PermissionGrantDto[] {
  return Array.from(grants).map((key) => {
    const [moduleId, submoduleId, actionId] = key.split("|");
    return { moduleId, submoduleId, actionId };
  });
}

interface PermissionMatrixProps {
  matrix: AvailableMatrixDto | undefined;
  isLoading: boolean;
  error?: string | null;
  grants: Set<string>;
  onChange: (next: Set<string>) => void;
  readOnly?: boolean;
}

/**
 * Modules → submodules → grantable actions grid, rendered ONLY from the
 * org-filtered available matrix (O2) — port of the legacy facturacion
 * `permisos_modulo` checkbox grid as design-system toggle chips.
 */
export function PermissionMatrix({
  matrix,
  isLoading,
  error,
  grants,
  onChange,
  readOnly = false,
}: PermissionMatrixProps) {
  const { t } = useLanguage();
  // Accordion: only one module card open at a time (view AND edit modes) so
  // the drawer stays scannable — opening a card collapses the rest.
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const modules = useMemo(
    () =>
      (matrix?.modules ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [matrix]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton-block h-4 w-36 mb-3" />
            <div className="skeleton-block-dim h-3 w-full mb-2" />
            <div className="skeleton-block-dim h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  if (modules.length === 0) {
    return (
      <div className="card card-muted p-5 text-center">
        <p className="t-sm text-muted-foreground">{t("roles.matrix.empty")}</p>
      </div>
    );
  }

  const toggleCell = (key: string) => {
    if (readOnly) return;
    const next = new Set(grants);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const setMany = (keys: string[], selected: boolean) => {
    if (readOnly) return;
    const next = new Set(grants);
    for (const key of keys) {
      if (selected) next.add(key);
      else next.delete(key);
    }
    onChange(next);
  };

  const moduleKeys = (module: MatrixModule): string[] =>
    module.submodules.flatMap((sub) =>
      sub.actions.map((a) => grantKey(module.id, sub.id, a.id))
    );

  return (
    <div className="flex flex-col gap-3">
      {modules.map((module) => {
        const allKeys = moduleKeys(module);
        const selectedCount = allKeys.filter((k) => grants.has(k)).length;
        const allSelected = allKeys.length > 0 && selectedCount === allKeys.length;
        const isExpanded = openModuleId === module.id;

        return (
          <SectionWrapper
            key={module.id}
            title={module.displayName}
            icon={Shield}
            badge={t("roles.matrix.selected", { count: selectedCount })}
            isExpanded={isExpanded}
            onToggle={() =>
              setOpenModuleId((cur) => (cur === module.id ? null : module.id))
            }
          >
            {!readOnly && (
              <div className="flex justify-end -mb-1">
                <button
                  type="button"
                  className="badge badge-outline cursor-pointer hover:bg-muted"
                  onClick={() => setMany(allKeys, !allSelected)}
                >
                  <Icon name={allSelected ? "close" : "check"} size={11} />
                  {allSelected
                    ? t("roles.matrix.clearAll")
                    : t("roles.matrix.selectAll")}
                </button>
              </div>
            )}

            {module.submodules
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col gap-1.5 py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <span className="t-sm font-semibold text-foreground">
                    {sub.displayName}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.actions.map((action) => {
                      const key = grantKey(module.id, sub.id, action.id);
                      const selected = grants.has(key);
                      return (
                        <button
                          key={action.id}
                          type="button"
                          disabled={readOnly}
                          aria-pressed={selected}
                          onClick={() => toggleCell(key)}
                          className={`badge ${
                            selected
                              ? "badge-primary-soft"
                              : "badge-outline text-muted-foreground"
                          } ${
                            readOnly
                              ? "cursor-default opacity-80"
                              : "cursor-pointer hover:bg-muted"
                          }`}
                        >
                          {selected && <Icon name="check" size={11} />}
                          {action.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </SectionWrapper>
        );
      })}
    </div>
  );
}
