import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Spinner } from "@/components/ui";
import Routes from "@/Routes";

export default function App() {
  const { isLoading } = useAuthContext();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size={40} fullHeight label={t("common.loading")} />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Routes />
    </ThemeProvider>
  );
}
