import { Icon, Badge, Button } from "@/components/ui";
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
  /** Live session badge — preserved on the left after the documents toolbar */
  sessionName?: string;
  sessionLocation?: string;
}

export function DashboardHeader({
  onMenuClick,
  onDocsClick,
  docsOpen = false,
  sessionName,
  sessionLocation,
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

  return (
    <header
      className="nav-bar"
      style={{
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      {/* LEFT SLOT — hamburger · page title · documents toolbar · live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <button
          className="btn btn-ghost btn-sm btn-icon dashboard-hamburger"
          onClick={onMenuClick}
        >
          <Icon name="menu" size={18} />
        </button>

        {/* Desktop-only documents toolbar (Documentos tab + open tab strip) */}
        <div className="documents-toolbar-desktop" style={{ minWidth: 0, display: "none" }}>
          <DocumentsToolbar />
        </div>

        {/* Live session badge — kept on the left after the toolbar */}
        {sessionName && (
          <>
            <Badge variant="success" style={{ gap: 6, flexShrink: 0 }}>
              <span
                className="status-dot status-dot-live"
                style={{ width: 6, height: 6 }}
              />
              {t("shell.liveLabel")}
            </Badge>
            <div style={{ minWidth: 0, flexShrink: 0 }}>
              <div className="t-label" style={{ fontSize: 10 }}>
                {t("shell.activeSession")}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 200,
                }}
              >
                {sessionName}
                {sessionLocation && ` · ${sessionLocation}`}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT SLOT — + Nuevo · 🔔 · flag · dark · sync · 📄 (mobile drawer toggle) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
            style={{ width: 20, height: "auto", borderRadius: 2 }}
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
      </div>

      <style>{`
        /* Default (hidden) — flip visibility per viewport + overflow state */
        .documents-drawer-toggle { display: none; }
        @media (min-width: 769px) {
          .documents-toolbar-desktop { display: flex !important; align-items: center; }
          /* Desktop: drawer toggle only when there are overflow tabs */
          .documents-drawer-toggle.has-overflow { display: inline-flex !important; }
        }
        @media (max-width: 768px) {
          .documents-toolbar-desktop { display: none !important; }
          /* Mobile: drawer toggle always visible (it's the only doc access) */
          .documents-drawer-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
