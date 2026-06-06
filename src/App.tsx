import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Routes from "@/Routes";

export default function App() {
  const { isLoading } = useAuthContext();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl animate-bounce">🏪</div>
          <div className="text-primary font-barlow text-xl font-bold animate-pulse">
            {t("common.loading")}
          </div>
        </div>
      </div>
    );
  }

  return <Routes />;
}
