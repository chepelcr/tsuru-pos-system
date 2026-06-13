import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon, Spinner } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from "@/routePaths";
import { THEME_LIST, type ThemeDef } from "@/theme/themes";

/**
 * Organization theme gallery.
 *
 * Shows every available POS theme as a swatch card (3 colour dots +
 * font sample). The active theme is highlighted. Selecting a theme:
 *   1. calls `setThemeId` for an INSTANT live re-paint, and
 *   2. persists the choice on the org via `useUpdateOrgTheme`.
 *
 * The colour dots interpolate the theme's own HSL triples into `hsl(...)` at
 * render time — a data-driven inline style, which the design system permits
 * (see CLAUDE.md §3.6 case 4). No static colour literals are introduced.
 */
export default function OrgThemePage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization, useUpdateOrgTheme } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const { themeId, setThemeId } = useThemeContext();
  const [, navigate] = useLocation();
  usePageTitle([t("theme.title")]);

  const updateTheme = useUpdateOrgTheme();

  // Each swatch persists the theme on click, so the grid is a write surface.
  // Without update permission the swatches stay visible (read view) but
  // non-interactive. Fail-open while my-permissions resolves.
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "theme");

  if (orgLoading || !org) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
        <div className="text-center text-muted-foreground">
          <Spinner size={28} />
          <p className="t-sm mt-3">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const handleSelect = (theme: ThemeDef) => {
    if (!canUpdate || theme.id === themeId) return;
    setThemeId(theme.id); // instant live apply
    updateTheme.mutate(
      { orgId: org.id, theme: theme.id },
      { onSuccess: () => navigate(ROUTES.DASHBOARD_ORG_SETTINGS) }
    );
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_LIST.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme)}
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
      </FadeIn>
    </div>
  );
}
