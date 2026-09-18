import { useLocation } from "wouter";
import { Icon, Button, Menu, type MenuItem } from "@/components/ui";
import { useAuthContext } from "@/contexts/AuthContext";
import { ROUTES } from "@/routePaths";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentStore } from "@/store/documentStore";
import { useMaxVisibleTabs } from "@/store/uiStore";
import { DocumentsToolbar } from "@/components/documents/DocumentsToolbar";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { NotificationsBell } from "@/components/layout/NotificationsBell";

interface DashboardHeaderProps {
  /** Mobile hamburger → opens left sidebar drawer */
  onMenuClick: () => void;
  /** Docs icon → toggles right-side documents drawer (open/close) */
  onDocsClick?: () => void;
  /** Whether the docs drawer is currently open — drives toggle button styling */
  docsOpen?: boolean;
}

export function DashboardHeader({
  onMenuClick,
  onDocsClick,
  docsOpen = false,
}: DashboardHeaderProps) {
  const { dark, toggle: toggleDark } = useDarkMode();
  const { language, toggle: toggleLanguage } = useLanguageSwitch();
  const { t } = useLanguage();
  const openCount = useDocumentStore((s) => s.open_documents.length);
  const maxVisible = useMaxVisibleTabs();
  // On md+ the toolbar shows the first `maxVisible` open tabs (2 with the
  // sidebar expanded, 3 when collapsed). Extras live in the drawer — and the
  // drawer toggle button is only surfaced when there's at least one.
  const overflowCount = Math.max(0, openCount - maxVisible);
  const hasOverflow = overflowCount > 0;

  const { user, logout } = useAuthContext();
  const [, setLocation] = useLocation();

  // Initials for the avatar trigger; the menu itself carries the labels.
  const accountName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.name || "";
  const accountInitials = accountName
    ? accountName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  // Account actions used to sit at the bottom of the sidebar, where they were
  // out of reach whenever it was collapsed. They belong to the person, not to
  // the navigation, so they live in the navbar now.
  const accountItems: MenuItem[] = [
    { label: t("shell.profile"), icon: "user", action: () => setLocation(ROUTES.PROFILE) },
    { label: t("shell.switchOrg"), icon: "store", action: () => setLocation(ROUTES.SELECT_ORG) },
    // Support moved out of the sidebar footer: it is an errand the person runs,
    // not a section of the app, and the sidebar hid it whenever it collapsed.
    { label: t("shell.support"), icon: "mail", action: () => setLocation(ROUTES.DASHBOARD_SUPPORT) },
    { label: t("shell.logout"), icon: "logOut", action: logout },
  ];

  return (
    <header className="nav-bar flex items-center justify-between gap-2.5 px-4 py-2.5">
      {/* LEFT SLOT — hamburger · documents toolbar.
          The live-session badge used to sit here too, which meant the tab strip
          and the shift indicator competed for the same horizontal space on
          every page. It moved to the sidebar footer, under the identity row,
          where it belongs: it describes the person's shift, not the document
          they happen to have open. */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          className="btn btn-ghost btn-sm btn-icon dashboard-hamburger"
          onClick={onMenuClick}
        >
          <Icon name="menu" size={18} />
        </button>

        {/* Desktop-only documents toolbar (Documentos tab + open tab strip) */}
        <div className="documents-toolbar-desktop">
          <DocumentsToolbar />
        </div>

      </div>

      {/* RIGHT SLOT — + Nuevo · 🔔 · flag · dark · sync · 📄 (mobile drawer toggle) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* New Document button — always visible; collapses to icon-only on sm+ */}
        <NewDocumentButton />

        {/* Notifications bell */}
        <NotificationsBell />

        {/* Language toggle + Country flag */}
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={toggleLanguage}
          aria-label="Toggle language"
        >
          <img
            src={language === "es" ? "https://flagcdn.com/w20/cr.png" : "https://flagcdn.com/w20/us.png"}
            alt={language === "es" ? "Costa Rica" : "United States"}
            className="w-5 h-auto rounded-sm"
          />
        </button>

        {/* Dark mode toggle */}
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={toggleDark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={dark ? "sun" : "moon"} size={16} />
        </button>

        {/* Sync button */}
        <Button variant="outline" size="sm" icon="refresh">
          {t("shell.sync")}
        </Button>

        {/* Right-drawer toggle (toggles open/close on click).
            - Mobile (<769px): always visible — the drawer is the only access to docs.
            - Desktop/tablet (≥769px): only visible when there are MORE than
              `maxVisible` open docs (overflow). Shows a count badge. */}
        {onDocsClick && (
          <button
            className={`btn ${docsOpen ? "btn-primary-soft" : "btn-ghost"} btn-sm btn-icon documents-drawer-toggle relative ${hasOverflow ? "has-overflow" : ""}`}
            onClick={onDocsClick}
            aria-label={docsOpen ? t("documents.drawer.closeAria") : t("documents.drawer.openAria")}
            aria-expanded={docsOpen}
          >
            <Icon name="fileText" size={18} />
            {hasOverflow && (
              <span
                aria-hidden
                className="badge-mini badge-mini-primary absolute -top-1 -right-1"
              >
                +{overflowCount}
              </span>
            )}
          </button>
        )}

        {/* Account menu — profile / organization / sign out */}
        <Menu
          items={accountItems}
          trigger={
            <button
              className="btn btn-ghost btn-sm btn-icon"
              type="button"
              aria-label={t("profile.openAria")}
            >
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-[11px]">
                {accountInitials}
              </span>
            </button>
          }
        />
      </div>

    </header>
  );
}
