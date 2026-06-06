import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Icon } from "@/components/ui";

interface AuthNavbarProps {
  leftSlot?: React.ReactNode;
}

export function AuthNavbar({ leftSlot }: AuthNavbarProps) {
  const { language, toggle: toggleLanguage } = useLanguageSwitch();
  const { dark, toggle: toggleDark } = useDarkMode();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-background/85 backdrop-blur-md border-b border-border">
      <div>{leftSlot}</div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleLanguage}
          className="btn btn-ghost btn-sm btn-icon"
          aria-label="Toggle language"
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
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={dark ? "sun" : "moon"} size={16} />
        </button>
      </div>
    </header>
  );
}
