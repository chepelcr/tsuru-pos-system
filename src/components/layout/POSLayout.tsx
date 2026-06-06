import type { SyncStatus } from "@/hooks/useSync";
import { useAuthContext } from "@/contexts/AuthContext";
import { Logo, SyncPill, Button, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface POSLayoutProps {
  children: React.ReactNode;
  syncStatus: SyncStatus;
  standName?: string;
  context?: string;
  sessionName?: string;
}

export default function POSLayout({
  children,
  syncStatus,
  standName,
  context,
  sessionName,
}: POSLayoutProps) {
  const { logout } = useAuthContext();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="nav-bar flex items-center justify-between px-4 py-2.5 flex-shrink-0">
        <Logo />
        <div className="flex items-center gap-3">
          <SyncPill state={syncStatus} />
          <Button variant="ghost" size="sm" icon="logOut" onClick={logout}>
            {t("shell.logout")}
          </Button>
        </div>
      </div>

      {/* Assignment context strip */}
      {standName && (
        <div className="px-4 py-2 bg-primary/[0.08] border-b border-primary/20 flex items-center gap-2 flex-shrink-0">
          <Icon name="mapPin" size={13} className="text-primary" />
          <span className="t-label !text-xs !text-primary">
            {standName}
            {context && ` · ${context.toUpperCase()}`}
            {sessionName && ` · ${sessionName}`}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
