import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOrgConfigurations } from "@/hooks/useOrgConfigurations";
import { useRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { Icon, Badge, Spinner } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from "@/routePaths";
import { FiscalInfoStepper } from "@/components/org-settings/registered-org/FiscalInfoStepper";

/**
 * Organization settings landing.
 *
 * Behaviour depends on whether the org has its Hacienda taxpayer profile
 * configured yet:
 *   • Loading       → skeleton.
 *   • No reg-org    → Windows-setup style welcome ghost takes over the main
 *                     content area. On "Comenzar", the FiscalInfoStepper
 *                     renders inline (no separate route). The dashboard
 *                     sidebar/header stay accessible — the welcome only
 *                     replaces the page body. Cards are HIDDEN until
 *                     fiscal info is saved.
 *   • Reg-org set   → Hacienda / Notifications / Fiscal-info cards as before.
 */
export default function OrgSettingsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings")]);
  const [, navigate] = useLocation();

  const { data: config, isLoading: configLoading } = useOrgConfigurations(org?.id);
  const { data: reg, isLoading: regLoading } = useRegisteredOrganization(org?.id);

  // Whether the user has dismissed the welcome ghost and is now inside the
  // inline stepper. Resets back to welcome on every page mount.
  const [setupStarted, setSetupStarted] = useState(false);

  // ── Initial loading ──────────────────────────────────────────────────────
  // Wait until we actually know whether the org has a registered_organization
  // row before deciding between welcome-ghost and cards. Otherwise the welcome
  // ghost flashes for a frame on every page mount before the queries resolve.
  //
  // We also wait for `configLoading` so the cards (which depend on
  // `config.notificationSettings`) don't flicker their "Pendiente" badges
  // into "Configurado".
  //
  // `useRegisteredOrganization` / `useOrgConfigurations` are gated by
  // `enabled: !!orgId`, so before `org` resolves their `isLoading` is `false`
  // — `!org` is the real signal that we're still on the first hop.
  if (orgLoading || !org || regLoading || configLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
        <div className="text-center text-muted-foreground">
          <Spinner size={28} />
          <p className="t-sm mt-3">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // ── Onboarding: no fiscal info yet ───────────────────────────────────────
  // The cards stay hidden until the org has a registered_organization row.
  if (!reg) {
    if (!setupStarted) {
      return (
        <WelcomeGhost
          onStart={() => setSetupStarted(true)}
          title={t("orgSettings.fiscalInfo.welcome.title")}
          subtitle={t("orgSettings.fiscalInfo.welcome.subtitle")}
          cta={t("orgSettings.fiscalInfo.welcome.cta")}
        />
      );
    }
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        <FadeIn duration={0.35}>
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="t-h2 mb-1">{t("orgSettings.fiscalInfo.setupTitle")}</h1>
              <p className="t-sm text-muted-foreground">
                {t("orgSettings.fiscalInfo.setupSubtitle")}
              </p>
            </div>
          </div>
          {org && (
            <FiscalInfoStepper
              orgId={org.id}
              onSaved={() => {
                // The query invalidates and `reg` flips truthy on the next
                // render → cards take over automatically.
                setSetupStarted(false);
              }}
            />
          )}
        </FadeIn>
      </div>
    );
  }

  // ── Configured: card grid ────────────────────────────────────────────────
  const cards = [
    {
      id: "fiscal-info",
      icon: "user",
      iconClass: "icon-pill-primary-soft",
      title: t("orgSettings.tab.fiscalInfo"),
      description: t("orgSettings.fiscalInfo.empty.desc"),
      configured: true,
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
    },
    {
      id: "notifications",
      icon: "sliders",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.notifications"),
      description: t("orgSettings.notifications.empty.desc"),
      configured: !!(config?.notificationSettings),
      loading: configLoading,
      route: ROUTES.DASHBOARD_ORG_NOTIFICATIONS,
    },
    {
      id: "theme",
      icon: "sparkles",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.theme"),
      description: t("theme.card.desc"),
      configured: !!org.theme,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_THEME,
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
    // Branding/Contact/Payment/Shipping derive from `org.settings.{...}`.
    // TODO(verify-endpoint): if the markets-api org list does NOT include
    // `settings`, these badges fall back to "pending"; wire the per-section
    // GETs (useOrgSettings) as the configured source once endpoints confirmed.
    {
      id: "branding",
      icon: "sparkles",
      iconClass: "icon-pill-rose-soft",
      title: t("orgSettings.tab.branding"),
      description: t("orgSettings.branding.empty.desc"),
      configured: !!org.settings?.theme,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_BRANDING,
    },
    {
      id: "contact",
      icon: "mapPin",
      iconClass: "icon-pill-info",
      title: t("orgSettings.tab.contact"),
      description: t("orgSettings.contact.empty.desc"),
      configured: !!org.settings?.contact,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_CONTACT,
    },
    {
      id: "payment",
      icon: "card",
      iconClass: "icon-pill-success",
      title: t("orgSettings.tab.payment"),
      description: t("orgSettings.payment.empty.desc"),
      configured: !!org.settings?.payment,
      loading: false,
      route: ROUTES.DASHBOARD_ORG_PAYMENT,
    },
    {
      id: "shipping",
      icon: "package",
      iconClass: "icon-pill-warning",
      title: t("orgSettings.tab.shipping"),
      description: t("orgSettings.shipping.empty.desc"),
      configured: !!org.settings?.shipping,
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

        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.id}
              className="card card-hover text-left w-full p-5 flex items-start gap-4 group"
              onClick={() => navigate(card.route)}
            >
              <div className={`icon-pill icon-pill-lg w-12 h-12 flex-shrink-0 ${card.iconClass}`}>
                <Icon name={card.icon} size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="t-h4 !mb-0">{card.title}</span>
                  {!card.loading && (
                    <Badge variant={card.configured ? "success" : "warning"}>
                      {card.configured
                        ? t("orgSettings.badge.configured")
                        : t("orgSettings.badge.pending")}
                    </Badge>
                  )}
                  {card.loading && (
                    <div className="skeleton-block h-5 w-20 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="t-sm text-muted-foreground leading-relaxed">{card.description}</p>
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

/**
 * Windows-setup-style welcome takeover for the org-settings page body. No back
 * button — the dashboard chrome (sidebar/header) remains for navigating away,
 * but inside the main panel there's no escape: the user either starts setup
 * or leaves via the global nav.
 *
 * Slow fade-in + scale-up gives the "ghost arriving" feel.
 */
function WelcomeGhost({
  onStart,
  title,
  subtitle,
  cta,
}: {
  onStart: () => void;
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <div
      className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12"
      style={{
        animation: "welcome-ghost 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <div className="text-center max-w-[560px]">
        <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-24 h-24 mx-auto mb-7">
          <Icon name="user" size={42} />
        </div>

        <h1 className="t-h1 mb-3">{title}</h1>
        <p className="t-body text-muted-foreground leading-relaxed mb-8">
          {subtitle}
        </p>

        <button
          type="button"
          onClick={onStart}
          className="btn btn-primary btn-lg"
        >
          <Icon name="arrowRight" size={16} />
          {cta}
        </button>
      </div>

      <style>{`
        @keyframes welcome-ghost {
          from { opacity: 0; transform: scale(0.96) translateY(8px); filter: blur(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0);    filter: blur(0); }
        }
      `}</style>
    </div>
  );
}
