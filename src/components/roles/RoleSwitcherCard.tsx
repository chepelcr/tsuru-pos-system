import { useState } from "react";
import { Button, Card, CardBody, CardDescription, CardHeader, CardTitle, Icon } from "@/components/ui";
import { FormAlert } from "@/components/common/FormAlert";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions, useSwitchActiveRole } from "@/hooks/useRbac";
import { roleLabel } from "@/lib/rbacI18n";

/**
 * "Role in this organization" (TSR-330). A member can hold several roles and
 * work under one at a time; switching takes effect immediately — every rbac
 * query is dropped, so the sidebar, pages and buttons re-resolve against the
 * new role — without signing out. Renders nothing for a single-role member.
 */
export function RoleSwitcherCard() {
  const { t } = useLanguage();
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { role: activeRole, assignedRoles } = usePermissions();
  const switchRole = useSwitchActiveRole();
  const [error, setError] = useState<string | null>(null);

  if (!activeRole || assignedRoles.length < 2) return null;

  const handleSwitch = async (roleId: string) => {
    if (!user?.userId || !org?.id) return;
    setError(null);
    try {
      await switchRole.mutateAsync({ userId: user.userId, orgId: org.id, roleId });
    } catch (err) {
      setError((err as Error)?.message || t("profile.roles.switchError"));
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name="shield" size={18} className="text-primary" />
          <CardTitle>{t("profile.roles.title")}</CardTitle>
        </div>
        <CardDescription>{t("profile.roles.description")}</CardDescription>
      </CardHeader>
      <CardBody>
        {error && <div className="mb-3"><FormAlert level="destructive" message={error} /></div>}
        <ul className="flex flex-col gap-2">
          {assignedRoles.map((r) => {
            const isActive = r.id === activeRole.id;
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                  isActive ? "border-primary bg-primary/[0.06]" : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">
                    {roleLabel(t, r.name, r.display_name)}
                  </div>
                  {!r.is_active && (
                    <div className="t-xs text-muted-foreground">{t("profile.roles.inactive")}</div>
                  )}
                </div>
                {isActive ? (
                  <span className="t-xs font-bold text-primary flex items-center gap-1">
                    <Icon name="checkCircle" size={14} /> {t("profile.roles.active")}
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!r.is_active || switchRole.isPending}
                    onClick={() => handleSwitch(r.id)}
                  >
                    {t("profile.roles.switch")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
