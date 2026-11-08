import type { MatrixModule } from "@/types/rbac";

/** Same key format as `grantKey` in PermissionMatrix (module|submodule|action ids). */
const key = (moduleId: string, submoduleId: string, actionId: string) =>
  `${moduleId}|${submoduleId}|${actionId}`;

function findKey(modules: MatrixModule[], module: string, submodule: string, action: string): string | null {
  const m = modules.find((x) => x.name === module);
  const s = m?.submodules.find((x) => x.name === submodule);
  const a = s?.actions.find((x) => x.name === action);
  return m && s && a ? key(m.id, s.id, a.id) : null;
}

/**
 * Creating sessions means assigning members to them, which needs the member
 * list: `admin/sessions:create` requires `admin/members:read` (TSR-R01-05;
 * management-be enforces the same rule on save).
 */
export function sessionsDependencyKeys(modules: MatrixModule[]) {
  return {
    sessionsCreate: findKey(modules, "admin", "sessions", "create"),
    membersRead: findKey(modules, "admin", "members", "read"),
  };
}

export type DependencyOutcome =
  | { kind: "apply"; grants: Set<string> }
  /** The user is removing members:read while sessions:create stays — ask first. */
  | { kind: "confirm"; withoutBoth: Set<string> };

/** Resolve a proposed grant change against the sessions → members dependency. */
export function resolveGrantDependencies(
  modules: MatrixModule[],
  previous: Set<string>,
  proposed: Set<string>,
): DependencyOutcome {
  const { sessionsCreate, membersRead } = sessionsDependencyKeys(modules);
  if (!sessionsCreate || !membersRead) return { kind: "apply", grants: proposed };
  if (!proposed.has(sessionsCreate) || proposed.has(membersRead)) return { kind: "apply", grants: proposed };
  if (previous.has(membersRead)) {
    const withoutBoth = new Set(proposed);
    withoutBoth.delete(sessionsCreate);
    return { kind: "confirm", withoutBoth };
  }
  // Marking sessions:create (alone or in bulk) brings members:read with it.
  const grants = new Set(proposed);
  grants.add(membersRead);
  return { kind: "apply", grants };
}
