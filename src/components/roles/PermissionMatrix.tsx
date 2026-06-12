import { useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { actionLabel, moduleLabel, submoduleLabel } from "@/lib/rbacI18n";
import type {
  AvailableMatrixDto,
  MatrixModule,
  MatrixSubmodule,
  PermissionGrantDto,
} from "@/types/rbac";

/**
 * Doc-type submodules of the `documents` module are CREATE-gates, not real
 * sections — the drawer renders them as a nested doc-type picker under
 * Emitidos→Crear instead of as submodule rows. Storage stays unchanged:
 * each pick serializes to a documents/<type> create grant.
 */
const DOC_TYPE_SUBS = new Set(["fe", "te", "nc", "nd", "fc", "fexp"]);

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

  /** documents/<type> create grant key, or null when unavailable. */
  const docTypeCreateKey = (module: MatrixModule, sub: MatrixSubmodule): string | null => {
    const create = sub.actions.find((a) => a.name === "create");
    return create ? grantKey(module.id, sub.id, create.id) : null;
  };

  /**
   * Emitidos→Crear drives the doc-type picker: enabling it defaults to ALL
   * doc types (previous behavior — deselect the sensitive ones); disabling
   * it clears the type grants so no orphan create-gates linger.
   */
  const toggleEmittedCreate = (
    module: MatrixModule,
    docTypeSubs: MatrixSubmodule[],
    key: string
  ) => {
    if (readOnly) return;
    const next = new Set(grants);
    const turningOn = !next.has(key);
    if (turningOn) next.add(key);
    else next.delete(key);
    for (const sub of docTypeSubs) {
      const typeKey = docTypeCreateKey(module, sub);
      if (!typeKey) continue;
      if (turningOn) next.add(typeKey);
      else next.delete(typeKey);
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {modules.map((module) => {
        const isDocs = module.name === "documents";
        const docTypeSubs = isDocs
          ? module.submodules
              .filter((s) => DOC_TYPE_SUBS.has(s.name))
              .sort((a, b) => a.sortOrder - b.sortOrder)
          : [];
        const rowSubs = module.submodules.filter(
          (s) => !(isDocs && DOC_TYPE_SUBS.has(s.name))
        );
        const allKeys = moduleKeys(module);
        const selectedCount = allKeys.filter((k) => grants.has(k)).length;
        const allSelected = allKeys.length > 0 && selectedCount === allKeys.length;
        const isExpanded = openModuleId === module.id;

        return (
          <SectionWrapper
            key={module.id}
            title={moduleLabel(t, module.name, module.displayName)}
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

            {rowSubs
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((sub) => {
                const isEmitted = isDocs && sub.name === "emitted";
                const emittedCreateAction = isEmitted
                  ? sub.actions.find((a) => a.name === "create")
                  : undefined;
                const emittedCreateKey = emittedCreateAction
                  ? grantKey(module.id, sub.id, emittedCreateAction.id)
                  : null;
                const showDocTypes =
                  !!emittedCreateKey &&
                  grants.has(emittedCreateKey) &&
                  docTypeSubs.length > 0;

                return (
                <div
                  key={sub.id}
                  className="flex flex-col gap-1.5 py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <span className="t-sm font-semibold text-foreground">
                    {submoduleLabel(t, module.name, sub.name, sub.displayName)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.actions.map((action) => {
                      const key = grantKey(module.id, sub.id, action.id);
                      const selected = grants.has(key);
                      const isDocTypeDriver =
                        isEmitted && action.name === "create";
                      return (
                        <button
                          key={action.id}
                          type="button"
                          disabled={readOnly}
                          aria-pressed={selected}
                          onClick={() =>
                            isDocTypeDriver
                              ? toggleEmittedCreate(module, docTypeSubs, key)
                              : toggleCell(key)
                          }
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
                          {actionLabel(t, action.name, action.displayName)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Doc-type picker — appears when Emitidos→Crear is on */}
                  {showDocTypes && (
                    <div className="mt-1 pl-3 border-l-2 border-border">
                      <span className="t-xs text-muted-foreground block mb-1.5">
                        {t("roles.matrix.docTypes")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {docTypeSubs.map((typeSub) => {
                          const typeKey = docTypeCreateKey(module, typeSub);
                          if (!typeKey) return null;
                          const selected = grants.has(typeKey);
                          return (
                            <button
                              key={typeSub.id}
                              type="button"
                              disabled={readOnly}
                              aria-pressed={selected}
                              onClick={() => toggleCell(typeKey)}
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
                              {submoduleLabel(t, module.name, typeSub.name, typeSub.displayName)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
          </SectionWrapper>
        );
      })}
    </div>
  );
}
