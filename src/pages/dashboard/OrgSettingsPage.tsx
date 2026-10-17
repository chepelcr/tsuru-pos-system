import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOrgConfigurations } from "@/hooks/useOrgConfigurations";
import { useRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { Icon, Badge } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from "@/routePaths";

/**
 * Organization settings landing.
 *
 * Settings remain accessible before fiscal setup. Hacienda credentials and
 * notifications unlock after fiscal identity is saved through its own page.
 */
export default function OrgSettingsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization, useOrgTheme } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { data: themeData } = useOrgTheme(org?.id);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings")]);
  const [, navigate] = useLocation();

  const { data: config, isLoading: configLoading } = useOrgConfigurations(org?.id);
  const { data: reg, isLoading: regLoading } = useRegisteredOrganization(org?.id);

  // Per-section RBAC gating: each card id doubles as a submodule of the
  // `organization` module (see rbac-seed.ts in tsuru-platform-api). Cards hide
  // when the role lacks read on the section; fail-closed like every other
  // gate (TSR-332) — the route boundary already waited for permissions.
  const { can } = usePermissions();
  const sectionVisible = (sectionId: string): boolean => can("organization", "read", sectionId);

  // ── Initial loading ──────────────────────────────────────────────────────
  // Wait for fiscal identity and configuration so card badges don't briefly
  // show "Pending" before their saved status is known.
  //
  // `useRegisteredOrganization` / `useOrgConfigurations` are gated by
  // `enabled: !!orgId`, so before `org` resolves their `isLoading` is `false`
  // — `!org` is the real signal that we're still on the first hop.
  if (orgLoading || !org || regLoading || configLoading) {
    // Skeleton mirrors the configured card grid (icon pill + title + badge +
    // description), same responsive layout as products/clients pages.
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        <div className="mb-8">
          <div className="skeleton-block h-8 w-56 mb-2 animate-pulse" />
          <div className="skeleton-block h-4 w-80 max-w-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted/40 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="skeleton-block h-4 w-28 animate-pulse" />
                  <div className="skeleton-block h-5 w-20 rounded-full animate-pulse" />
                </div>
                <div className="skeleton-block h-3 w-full mb-1.5 animate-pulse" />
                <div className="skeleton-block h-3 w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Settings card grid ───────────────────────────────────────────────────
  const cards = [
    {
      id: "fiscal-info",
      icon: "user",
      iconClass: "icon-pill-primary-soft",
      title: t("orgSettings.tab.fiscalInfo"),
      description: t("orgSettings.fiscalInfo.empty.desc"),
      configured: !!reg,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_FISCAL_INFO,
    },
    {
      id: "hacienda",
      icon: "lock",
      iconClass: "icon-pill-primary-soft",
      title: t("orgSettings.tab.hacienda"),
      description: t("orgSettings.hacienda.empty.desc"),
      configured: config !== null && config !== undefined,
      loading: configLoading,
      route: ROUTES.DASHBOARD_ORG_HACIENDA,
      locked: !reg,
    },
    {
      id: "notifications",
      icon: "sliders",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.notifications"),
      description: t("orgSettings.notifications.empty.desc"),
      configured: !!(config?.notification_settings),
      loading: configLoading,
      route: ROUTES.DASHBOARD_ORG_NOTIFICATIONS,
      locked: !reg,
    },
    {
      id: "theme",
      icon: "sparkles",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.theme"),
      description: t("theme.card.desc"),
      configured: !!themeData?.theme,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_THEME,
    },
    // Plantilla (storefront template gallery) — moved here from the storefront
    // sidebar section. Gated as an `organization` submodule (organization/plantilla).
    {
      id: "plantilla",
      icon: "grid",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.plantilla"),
      description: t("orgSettings.plantilla.empty.desc"),
      configured: true,
      loading: false,
      route: ROUTES.DASHBOARD_TEMPLATES,
    },
    // ── Storefront / org-settings cards (plan 05) ────────────────────────────
    // General is always configured — the org always has a name.
    {
      id: "general",
      icon: "settings",
      iconClass: "icon-pill-primary-soft",
      title: t("orgSettings.tab.general"),
      description: t("orgSettings.general.empty.desc"),
      configured: true,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_GENERAL,
    },
    // Branding/Contact/Payment/Shipping derive from the EMBEDDED org-response
    // sections (shared org contract): each is the section object or null when
    // the org hasn't configured it. (Branding reads `org.branding`, sourced
    // from theme_settings — NOT the POS shell theme scalar.)
    {
      id: "branding",
      icon: "sparkles",
      iconClass: "icon-pill-rose-soft",
      title: t("orgSettings.tab.branding"),
      description: t("orgSettings.branding.empty.desc"),
      configured: !!org.branding,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_BRANDING,
    },
    {
      id: "contact",
      icon: "mapPin",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.contact"),
      description: t("orgSettings.contact.empty.desc"),
      configured: !!org.contact,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_CONTACT,
    },
    {
      id: "payment",
      icon: "card",
      iconClass: "icon-pill-success",
      title: t("orgSettings.tab.payment"),
      description: t("orgSettings.payment.empty.desc"),
      configured: !!org.payment,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_PAYMENT,
    },
    {
      id: "shipping",
      icon: "package",
      iconClass: "icon-pill-warning",
      title: t("orgSettings.tab.shipping"),
      description: t("orgSettings.shipping.empty.desc"),
      configured: !!org.shipping,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_SHIPPING,
    },
  ];

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      <FadeIn duration={0.3}>
        <div className="mb-8">
          <h1 className="t-h1 mb-1">{t("orgSettings.title")}</h1>
          <p className="t-body text-muted-foreground">{t("orgSettings.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.filter((card) => sectionVisible(card.id)).map((card) => (
            <button
              key={card.id}
              className={`card text-left w-full p-5 flex items-start gap-4 ${card.locked ? "opacity-60 cursor-not-allowed" : "card-hover group"}`}
              onClick={() => navigate(card.route)}
              disabled={card.locked}
              aria-describedby={card.locked ? `${card.id}-fiscal-required` : undefined}
            >
              <div className={`icon-pill icon-pill-lg w-12 h-12 flex-shrink-0 ${card.iconClass}`}>
                <Icon name={card.icon} size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="t-h4 !mb-0 truncate min-w-0 flex-1">{card.title}</span>
                  {!card.loading && (
                    <Badge variant={card.locked ? "secondary" : card.configured ? "success" : "warning"} className="flex-shrink-0">
                      {card.locked
                        ? t("orgSettings.badge.locked")
                        : card.configured
                        ? t("orgSettings.badge.configured")
                        : t("orgSettings.badge.pending")}
                    </Badge>
                  )}
                  {card.loading && (
                    <div className="skeleton-block h-5 w-20 rounded-full animate-pulse flex-shrink-0" />
                  )}
                </div>
                <p className="t-sm text-muted-foreground leading-relaxed">{card.description}</p>
                {card.locked && (
                  <p id={`${card.id}-fiscal-required`} className="t-sm mt-2 flex items-center gap-1.5">
                    <Icon name="lock" size={13} />
                    {t("orgSettings.fiscalInfo.requiredFirst")}
                  </p>
                )}
              </div>

              <div className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
                <Icon name="chevronRight" size={18} />
              </div>
            </button>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
