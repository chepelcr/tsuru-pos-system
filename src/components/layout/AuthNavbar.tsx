import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { Icon, Logo, Button } from "@/components/ui";
import { ROUTES } from "@/routePaths";

interface AuthNavbarProps {
  /** Custom left-side content. Defaults to the POS <Logo />. */
  leftSlot?: ReactNode;
  /** Show a logout button instead of the back-to-home button. */
  showLogout?: boolean;
  /**
   * Hide the back/logout nav button entirely. Defaults to true so existing
   * bare `<AuthNavbar />` usages keep their toggle-only layout; pages opt into
   * a nav button via `showLogout` / `showBothButtons`.
   */
  hideNavButton?: boolean;
  /** Show both back-to-home and logout buttons. */
  showBothButtons?: boolean;
}

/**
 * Top bar for auth/onboarding screens. Mirrors the dashboard auth-navbar
 * behavior: a logo (or custom leftSlot), a language switch, a dark-mode toggle,
 * and optional back-to-home / logout buttons. Built from POS primitives only.
 */
export function AuthNavbar({
  leftSlot,
  showLogout = false,
  hideNavButton = true,
  showBothButtons = false,
}: AuthNavbarProps) {
  const { language, toggle: toggleLanguage } = useLanguageSwitch();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { t } = useLanguage();
  const { logout } = useAuthContext();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };
  const goHome = () => navigate(ROUTES.LOGIN);

  // Explicit button flags take precedence over the hide default.
  const renderNavButton = !hideNavButton || showLogout || showBothButtons;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2">
        {leftSlot ?? <Logo size={32} />}

        {renderNavButton && showBothButtons && (
          <div className="flex items-center gap-1 ml-1">
            <Button variant="ghost" size="sm" icon="home" onClick={goHome}>
              {t("auth.login.backToHome")}
            </Button>
            <Button variant="ghost" size="sm" icon="logOut" onClick={handleLogout}>
              {t("auth.logout")}
            </Button>
          </div>
        )}
        {renderNavButton && !showBothButtons && showLogout && (
          <Button variant="ghost" size="sm" icon="logOut" className="ml-1" onClick={handleLogout}>
            {t("auth.logout")}
          </Button>
        )}
        {renderNavButton && !showBothButtons && !showLogout && (
          <Button variant="ghost" size="sm" icon="home" className="ml-1" onClick={goHome}>
            {t("auth.login.backToHome")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleLanguage}
          className="btn btn-ghost btn-sm btn-icon"
          aria-label={t("auth.toggleLanguage")}
        >
          <img
            src={language === "es" ? "https://flagcdn.com/w20/cr.png" : "https://flagcdn.com/w20/us.png"}
            alt={language === "es" ? "Costa Rica" : "United States"}
            className="w-5 h-auto rounded-sm"
          />
        </button>
        <button
          type="button"
          onClick={toggleDark}
          className="btn btn-ghost btn-sm btn-icon"
          aria-label={t("auth.toggleTheme")}
        >
          <Icon name={dark ? "sun" : "moon"} size={16} />
        </button>
      </div>
    </header>
  );
}
