import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions, useCreatableDocTypes } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentStore, newDocTabId } from "@/store/documentStore";
import { documentEditorPath, ROUTES } from "@/routePaths";
import { DOCUMENT_TYPES } from "@/types/invoice";
import type { DocTypeCode } from "@/types/invoice";
import { Icon, Logo } from "@/components/ui";

type NavId = "dashboard" | "config" | "puestos" | "productos" | "categories" | "reporte" | "documents" | "clients" | "orders" | "confirmations" | "members" | "roles" | "organization" | "content" | "gallery" | "templates" | "deployments" | "profile";

interface DashboardSidebarProps {
  active: NavId;
  onNav: (id: NavId) => void;
  onClose?: () => void;
}

/** Icon + i18n label for each navigable item. */
const ITEM_META: Partial<Record<NavId, { icon: string; labelKey: string }>> = {
  dashboard:     { icon: "chart",       labelKey: "shell.panel" },
  productos:     { icon: "package",     labelKey: "shell.products" },
  categories:    { icon: "layers",      labelKey: "shell.categories" },
  clients:       { icon: "user",        labelKey: "shell.clients" },
  orders:        { icon: "cart",        labelKey: "shell.orders" },
  confirmations: { icon: "checkCircle", labelKey: "shell.confirmations" },
  organization:  { icon: "settings",    labelKey: "shell.orgSettings" },
  puestos:       { icon: "store",       labelKey: "shell.stations" },
  members:       { icon: "users",       labelKey: "shell.members" },
  roles:         { icon: "shield",      labelKey: "shell.roles" },
  config:        { icon: "calendar",    labelKey: "shell.sessions" },
  reporte:       { icon: "trending",    labelKey: "shell.reports" },
  content:       { icon: "fileText",    labelKey: "shell.content" },
  gallery:       { icon: "grid",        labelKey: "shell.gallery" },
  templates:     { icon: "grid",        labelKey: "shell.templates" },
  deployments:   { icon: "upload",      labelKey: "shell.deployments" },
};

type SectionId = "commercial" | "admin" | "storefront" | "analytics";

/**
 * RBAC map — the catalog mirrors this sidebar 1:1 (modules = sections /
 * standalone items, submodules = section items; see rbac-seed.ts in
 * tsuru-platform-api). Every NavId maps to its [module, submodule]; items
 * hide when the org/role lacks read on that pair (legacy validar_permiso).
 */
const NAV_PERMISSION: Partial<Record<NavId, [string, string]>> = {
  dashboard:     ["panel", "overview"],
  productos:     ["commercial", "products"],
  categories:    ["commercial", "categories"],
  clients:       ["commercial", "clients"],
  orders:        ["commercial", "orders"],
  confirmations: ["commercial", "confirmations"],
  organization:  ["admin", "organization"],
  puestos:       ["admin", "stations"],
  members:       ["admin", "members"],
  roles:         ["admin", "roles"],
  config:        ["admin", "sessions"],
  content:       ["storefront", "content"],
  gallery:       ["storefront", "gallery"],
  templates:     ["storefront", "templates"],
  deployments:   ["storefront", "deployments"],
  reporte:       ["reports", "general"],
  documents:     ["documents", "emitted"],
};

/** Collapsible sections. `Panel` (dashboard) and `Documentos` are standalone. */
const SECTIONS: { id: SectionId; labelKey: string; icon: string; items: NavId[] }[] = [
  { id: "commercial", labelKey: "shell.sectionCommercial", icon: "cart",     items: ["productos", "categories", "clients", "orders", "confirmations"] },
  { id: "admin",      labelKey: "shell.sectionAdmin",      icon: "users",    items: ["organization", "puestos", "members", "roles", "config"] },
  { id: "storefront", labelKey: "shell.sectionStorefront", icon: "store",    items: ["content", "gallery", "templates", "deployments"] },
];

function sectionOf(active: NavId): SectionId | null {
  for (const s of SECTIONS) if (s.items.includes(active)) return s.id;
  return null;
}

export function DashboardSidebar({ active, onNav, onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  // RBAC nav gating (my-permissions, O1). Fail-open while unresolved — the
  // backend rollout starts with RBAC_ENFORCEMENT=log, so the item only hides
  // once an authoritative permission set says the caller can't read roles.
  const { can, isReady: permsReady } = usePermissions();
  // Per-doc-type create gating (documents/<permSub>): the "+" menu only lists
  // the types this role may create — e.g. cashiers see FE/TE, never NC/ND.
  const creatableDocTypes = useCreatableDocTypes();
  const { t } = useLanguage();
  const { addDocumentTab } = useDocumentStore();
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  // Accordion: only one section open at a time. Defaults to (and follows) the
  // section that owns the active route, so the current page's section is marked.
  const [openSection, setOpenSection] = useState<SectionId | null>(() => sectionOf(active));
  useEffect(() => {
    const s = sectionOf(active);
    if (s) setOpenSection(s);
  }, [active]);

  const toggleSection = (id: SectionId) =>
    setOpenSection((cur) => (cur === id ? null : id));

  const goNav = (id: NavId) => {
    onNav(id);
    onClose?.();
  };

  const handleCreateDoc = (docType: typeof DOCUMENT_TYPES[number]) => {
    setCreateOpen(false);
    const tabId = newDocTabId();
    addDocumentTab({
      id: tabId,
      type: "new",
      title: docType.label,
      doc_type: docType.code as DocTypeCode,
      data: { document_type: docType.code as DocTypeCode },
      is_dirty: false,
      opened_at: Date.now(),
    });
    setLocation(documentEditorPath(tabId));
    onClose?.();
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || "";
  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  const displayName = fullName || user?.email || "Usuario";

  // Legacy-style nav gating: an item shows only when the role can read its
  // module/submodule (fail-open until my-permissions resolves).
  const itemVisible = (id: NavId): boolean => {
    const perm = NAV_PERMISSION[id];
    if (!perm || !permsReady) return true;
    return can(perm[0], "read", perm[1]);
  };

  const renderItem = (id: NavId) => {
    const meta = ITEM_META[id];
    if (!meta) return null;
    if (!itemVisible(id)) return null;
    return (
      <button
        key={id}
        className={`sidebar-item ${active === id ? "active" : ""}`}
        onClick={() => goNav(id)}
      >
        <Icon name={meta.icon} size={16} />
        {t(meta.labelKey)}
      </button>
    );
  };

  return (
    <aside className="sidebar w-full h-full flex flex-col overflow-hidden">
      {/* ── HEADER (always visible) ── */}
      <div className="shrink-0 px-4 pt-4">
        <div className="px-2 pt-1 pb-4 border-b border-sidebar-border flex items-center justify-between">
          <Logo orgName={org?.name} />
          {onClose && (
            <button className="btn btn-ghost btn-sm btn-icon ml-2" onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE NAV (only this region scrolls) ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 flex flex-col gap-0.5">
        <div className="t-label px-2.5 pb-1.5">{t("shell.navigation")}</div>

        {/* Panel — standalone, primary view */}
        {renderItem("dashboard")}

        {/* Collapsible sections (accordion) — hidden when no item is visible */}
        {SECTIONS.map((section) => {
          if (!section.items.some(itemVisible)) return null;
          const open = openSection === section.id;
          const containsActive = section.items.includes(active);
          return (
            <div key={section.id} className="mt-1.5">
              <button
                type="button"
                aria-expanded={open}
                className={`sidebar-item w-full justify-between ${open || containsActive ? "active" : ""}`}
                onClick={() => toggleSection(section.id)}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon name={section.icon} size={16} />
                  <span className="truncate">{t(section.labelKey)}</span>
                </span>
                <Icon
                  name="chevronDown"
                  size={14}
                  className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {/* Animated collapse — grid-rows 0fr→1fr (see .nav-collapse in index.css) */}
              <div className="nav-collapse" data-open={open}>
                <div>
                  <div className="flex flex-col gap-0.5 pl-3 pt-0.5">
                    {section.items.map(renderItem)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Reportes — standalone item (not wrapped in a collapsible section) */}
        <div className="mt-1.5">{renderItem("reporte")}</div>

        {/* Documentos — standalone, at the end of the menu */}
        {itemVisible("documents") && (
        <div className="relative flex items-stretch gap-0.5 mt-1.5">
          <button
            className={`sidebar-item flex-1 min-w-0 ${active === "documents" ? "active" : ""}`}
            onClick={() => goNav("documents")}
          >
            <Icon name="fileText" size={16} />
            {t("shell.documents")}
          </button>

          {(!permsReady || can("documents", "create", "emitted")) && creatableDocTypes.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCreateOpen((v) => !v);
            }}
            title={t("shell.createDocument")}
            aria-label={t("shell.createDocument")}
            className={`flex items-center justify-center w-8 flex-shrink-0 rounded-lg cursor-pointer transition-colors border ${
              createOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-primary text-primary-foreground"
            }`}
          >
            <Icon name="plus" size={14} />
          </button>
          )}

          {createOpen && (
            <>
              <div className="fixed inset-0 z-dropdown" onClick={() => setCreateOpen(false)} />
              <div className="absolute bottom-full mb-1 left-0 right-0 z-overlay bg-card border border-border rounded-lg shadow-dropdown-up p-1 flex flex-col gap-px">
                {creatableDocTypes.map((dt) => (
                  <button
                    key={dt.code}
                    onClick={() => handleCreateDoc(dt)}
                    className="flex items-center gap-2 px-2.5 py-2 bg-transparent border-0 rounded-md cursor-pointer text-xs text-foreground text-left w-full hover:bg-muted"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dt.dotColor }} />
                    <span className="font-bold text-[10px] opacity-70">{dt.short}</span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{dt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        )}
      </nav>

      {/* ── FOOTER (always visible) ── */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-sidebar-border flex flex-col gap-0.5">
        <button
          className="sidebar-item flex items-center gap-2 text-left"
          onClick={() => {
            setLocation(ROUTES.PROFILE);
            onClose?.();
          }}
          aria-label={t("profile.openAria")}
        >
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
              {displayName}
            </div>
            <div className="t-xs text-muted-foreground">{user?.role ?? ""}</div>
          </div>
        </button>
        <button className="sidebar-item" onClick={logout}>
          <Icon name="logOut" size={16} /> {t("shell.logout")}
        </button>
      </div>
    </aside>
  );
}
