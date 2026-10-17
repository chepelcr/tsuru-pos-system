import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from "@/routePaths";
import { SettingsDetailCard, SettingsDetailRow } from "@/components/org-settings/SettingsDetailCard";
import { SettingsEditDrawer } from "@/components/org-settings/SettingsEditDrawer";
import { THEME_LIST } from "@/theme/themes";

/** Appearance opens with a saved-theme summary. Theme choices stay in the
 * drawer as a draft and apply to the shell only after a successful save. */
export default function OrgThemePage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization, useUpdateOrgTheme } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const { themeId, setThemeId } = useThemeContext();
  const [, navigate] = useLocation();
  usePageTitle([t("theme.title")]);

  const updateTheme = useUpdateOrgTheme();
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(themeId);
  const [saved, setSaved] = useState(false);

  // Each swatch persists the theme on click, so the grid is a write surface.
  // Without update permission the swatches stay visible (read view) but
  // non-interactive. Fail-open while my-permissions resolves.
  const { can } = usePermissions();
  const canUpdate = can("organization", "update", "theme");

  if (orgLoading || !org) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        <div className="mb-8">
          <div className="skeleton-block animate-pulse h-7 w-40 mb-3 rounded" />
          <div className="skeleton-block animate-pulse h-8 w-56 mb-2 rounded" />
          <div className="skeleton-block animate-pulse h-4 w-72 rounded" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card text-left w-full p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="skeleton-block animate-pulse h-5 w-28 rounded" />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-muted/40 animate-pulse" />
                <span className="w-7 h-7 rounded-full bg-muted/40 animate-pulse" />
                <span className="w-7 h-7 rounded-full bg-muted/40 animate-pulse" />
              </div>

              <div className="skeleton-block animate-pulse h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeTheme = THEME_LIST.find((theme) => theme.id === themeId) ?? THEME_LIST[0];
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canUpdate || updateTheme.isPending) return;
    try {
      if (selectedId !== themeId) await updateTheme.mutateAsync({ orgId: org.id, theme: selectedId });
      setThemeId(selectedId);
      setEditingOrgId(null);
      setSaved(true);
    } catch {
      // Keep the selected draft and the persisted appearance unchanged on failure.
    }
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      <FadeIn duration={0.3}>
        <div className="mb-8">
          <button
            className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground"
            onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}
          >
            <Icon name="arrowLeft" size={15} />
            {t("orgSettings.title")}
          </button>
          <h1 className="t-h1 mb-1">{t("theme.title")}</h1>
          <p className="t-body text-muted-foreground">{t("theme.subtitle")}</p>
        </div>

        {saved && <p role="status" className="t-sm text-success mb-4">{t("theme.saved")}</p>}
        <SettingsDetailCard title={t("theme.title")} icon="sparkles" onEdit={canUpdate ? () => {
          updateTheme.reset(); setSelectedId(themeId); setSaved(false); setEditingOrgId(org.id);
        } : undefined}>
          <dl>
            <SettingsDetailRow label={t("common.name")} value={activeTheme.name} />
            <SettingsDetailRow label={t("orgSettings.branding.fontFamily")} value={activeTheme.fonts.display} />
            <SettingsDetailRow label={t("orgSettings.branding.primaryColor")} value={<span className="inline-block h-8 w-8 rounded-full border border-border" style={{ background: `hsl(${activeTheme.light.primary})` }} />} />
            <SettingsDetailRow label={t("theme.fontSample")} value={<span style={{ fontFamily: activeTheme.fonts.display }}>{t("theme.fontSample")}</span>} />
          </dl>
        </SettingsDetailCard>
      </FadeIn>
      {canUpdate && <SettingsEditDrawer key={org.id} open={editingOrgId === org.id} onClose={() => setEditingOrgId(null)}
        title={t("theme.title")} icon="sparkles" formId="org-theme-edit" isBusy={updateTheme.isPending}
        error={updateTheme.isError ? t("theme.saveError") : undefined}>
        <form id="org-theme-edit" onSubmit={handleSave}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_LIST.map((theme) => {
              const active = theme.id === selectedId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedId(theme.id)}
                  aria-pressed={active}
                  disabled={updateTheme.isPending}
                  className={`card card-hover text-left w-full p-4 flex flex-col gap-3 group ${
                    active ? "card-primary ring-2 ring-primary/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-h4 !mb-0 truncate">{theme.name}</span>
                    {active && (
                      <span className="icon-pill icon-pill-primary-soft w-7 h-7 flex-shrink-0">
                        <Icon name="check" size={16} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" aria-hidden="true">
                    <span
                      className="w-7 h-7 rounded-full border border-border"
                      style={{ background: `hsl(${theme.light.primary})` }}
                    />
                    <span
                      className="w-7 h-7 rounded-full border border-border"
                      style={{ background: `hsl(${theme.light.secondary})` }}
                    />
                    <span
                      className="w-7 h-7 rounded-full border border-border"
                      style={{ background: `hsl(${theme.light.accent})` }}
                    />
                  </div>

                  <div
                    className="t-body text-muted-foreground leading-snug"
                    style={{ fontFamily: theme.fonts.display }}
                  >
                    {t("theme.fontSample")}
                  </div>
                </button>
              );
            })}
          </div>
        </form>
      </SettingsEditDrawer>}

    </div>
  );
}
