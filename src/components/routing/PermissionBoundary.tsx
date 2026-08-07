import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { Button, Icon, Spinner } from "@/components/ui";

export type PermissionRequirement = readonly [
  module: string,
  action: string,
  submodule?: string,
];

interface PermissionBoundaryProps {
  children: ReactNode;
  requirements: readonly PermissionRequirement[];
  mode?: "any" | "all";
}

/**
 * Resolves route permissions before rendering its children. Lazy page elements
 * placed below this boundary are therefore never imported for unauthorized
 * users (the backend remains the security authority).
 */
export function PermissionBoundary({
  children,
  requirements,
  mode = "any",
}: PermissionBoundaryProps) {
  const { t } = useLanguage();
  const { can, isReady, isLoading, isError, refetch } = usePermissions();

  if (!isReady) {
    if (isError) {
      return (
        <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
          <Icon name="alertCircle" size={28} className="text-destructive" />
          <p className="t-sm text-muted-foreground">{t("routes.permissionsError")}</p>
          <Button variant="outline" size="sm" icon="refresh" onClick={refetch}>
            {t("common.retry")}
          </Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="min-h-[45vh] flex items-center justify-center">
          <Spinner size={32} label={t("routes.loadingPermissions")} />
        </div>
      );
    }

    // The query is waiting for authenticated organization context. Keep the
    // route fail-closed so its lazy module is not downloaded prematurely.
    return null;
  }

  const checks = requirements.map(([module, action, submodule]) =>
    can(module, action, submodule),
  );
  const allowed = mode === "all" ? checks.every(Boolean) : checks.some(Boolean);

  if (!allowed) {
    return (
      <div className="min-h-[45vh] flex flex-col items-center justify-center gap-2 px-6 text-center">
        <Icon name="lock" size={30} className="text-muted-foreground" />
        <h1 className="t-h3">{t("routes.accessDenied")}</h1>
        <p className="t-sm text-muted-foreground max-w-md">
          {t("routes.accessDeniedDescription")}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
