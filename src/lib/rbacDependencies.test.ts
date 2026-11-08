import { describe, expect, it } from "vitest";
import type { MatrixModule } from "@/types/rbac";
import { resolveGrantDependencies } from "./rbacDependencies";

const action = (id: string, name: string) => ({ id, name, display_name: name });
const modules: MatrixModule[] = [{
  id: "m-admin", name: "admin", display_name: "Admin", icon: null, sort_order: 1,
  submodules: [
    { id: "s-members", name: "members", display_name: "Members", sort_order: 1, actions: [action("a-read", "read"), action("a-create", "create")] },
    { id: "s-sessions", name: "sessions", display_name: "Sessions", sort_order: 2, actions: [action("a-read", "read"), action("a-create", "create")] },
  ],
}] as MatrixModule[];
const SESSIONS_CREATE = "m-admin|s-sessions|a-create";
const MEMBERS_READ = "m-admin|s-members|a-read";

describe("resolveGrantDependencies", () => {
  it("marks members:read when sessions:create is marked", () => {
    const outcome = resolveGrantDependencies(modules, new Set(), new Set([SESSIONS_CREATE]));
    expect(outcome).toEqual({ kind: "apply", grants: new Set([SESSIONS_CREATE, MEMBERS_READ]) });
  });

  it("asks before unmarking members:read while sessions:create stays", () => {
    const before = new Set([SESSIONS_CREATE, MEMBERS_READ]);
    const outcome = resolveGrantDependencies(modules, before, new Set([SESSIONS_CREATE]));
    expect(outcome).toEqual({ kind: "confirm", withoutBoth: new Set() });
  });

  it("leaves unrelated changes alone", () => {
    const outcome = resolveGrantDependencies(modules, new Set([MEMBERS_READ]), new Set());
    expect(outcome).toEqual({ kind: "apply", grants: new Set() });
  });
});
