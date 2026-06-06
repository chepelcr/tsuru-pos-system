import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentStore, newDocTabId } from "@/store/documentStore";
import { documentEditorPath } from "@/routePaths";
import { DOCUMENT_TYPES } from "@/types/invoice";
import type { DocTypeCode } from "@/types/invoice";
import { Icon, Logo } from "@/components/ui";

type NavId = "dashboard" | "config" | "puestos" | "productos" | "reporte" | "pos" | "documents" | "clients" | "organization";

interface DashboardSidebarProps {
  active: NavId;
  onNav: (id: NavId) => void;
  onClose?: () => void;
}

export function DashboardSidebar({ active, onNav, onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const { addDocumentTab } = useDocumentStore();
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const NAV_ITEMS: { id: NavId; icon: string; label: string }[] = [
    { id: "dashboard", icon: "chart", label: t("shell.panel") },
    { id: "config", icon: "settings", label: t("shell.sessions") },
    { id: "puestos", icon: "store", label: t("shell.stations") },
    { id: "productos", icon: "package", label: t("shell.products") },
    { id: "clients", icon: "user", label: t("shell.clients") },
    { id: "reporte", icon: "trending", label: t("shell.reports") },
    { id: "organization", icon: "settings", label: t("shell.orgSettings") },
  ];

  const docsActive = active === "documents";

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

  return (
    <aside className="sidebar w-full h-full flex flex-col p-4 overflow-y-auto overflow-x-hidden">
      {/* Logo */}
      <div className="px-2 pt-1 pb-5 border-b border-sidebar-border mb-3.5 flex items-center justify-between">
        <Logo orgName={org?.name} />
        {onClose && (
          <button className="btn btn-ghost btn-sm btn-icon ml-2" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {/* Nav label */}
      <div className="t-label px-2.5 pt-2 pb-1.5">{t("shell.navigation")}</div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${active === item.id ? "active" : ""}`}
            onClick={() => {
              onNav(item.id);
              onClose?.();
            }}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}

        {/* Documentos composite row */}
        <div className="relative flex items-stretch gap-0.5">
          <button
            className={`sidebar-item flex-1 min-w-0 ${docsActive ? "active" : ""}`}
            onClick={() => {
              onNav("documents");
              onClose?.();
            }}
          >
            <Icon name="fileText" size={16} />
            Documentos
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setCreateOpen((v) => !v);
            }}
            title="Crear documento"
            aria-label="Crear documento"
            className={`flex items-center justify-center w-8 flex-shrink-0 rounded-lg cursor-pointer transition-colors border ${
              createOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-primary text-primary-foreground"
            }`}
          >
            <Icon name="plus" size={14} />
          </button>

          {createOpen && (
            <>
              <div
                className="fixed inset-0 z-dropdown"
                onClick={() => setCreateOpen(false)}
              />
              <div className="absolute bottom-full mb-1 left-0 right-0 z-overlay bg-card border border-border rounded-lg shadow-dropdown-up p-1 flex flex-col gap-px">
                {DOCUMENT_TYPES.map((dt) => (
                  <button
                    key={dt.code}
                    onClick={() => handleCreateDoc(dt)}
                    className="flex items-center gap-2 px-2.5 py-2 bg-transparent border-0 rounded-md cursor-pointer text-xs text-foreground text-left w-full hover:bg-muted"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: dt.dotColor }}
                    />
                    <span className="font-bold text-[10px] opacity-70">{dt.short}</span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {dt.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="separator my-3" />

      {/* User + logout */}
      <div className="flex items-center gap-2 px-2.5 py-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
            {displayName}
          </div>
          <div className="t-xs text-muted-foreground">{user?.role ?? ""}</div>
        </div>
      </div>
      <button className="sidebar-item" onClick={logout}>
        <Icon name="logOut" size={16} /> {t("shell.logout")}
      </button>
    </aside>
  );
}
