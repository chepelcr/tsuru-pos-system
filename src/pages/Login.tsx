import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthNavbar } from "@/components/layout/AuthNavbar";

export default function Login() {
  const { user, login, isLoading } = useAuthContext();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  usePageTitle([t("pageTitle.login")]);

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/organizations/select");
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("auth.loginError");
      setError(errorMsg);
    }
  };

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <AuthNavbar />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="font-barlow font-extrabold text-3xl text-primary tracking-wide">
            JMarkets POS
          </h1>
          <p className="text-muted text-sm mt-1">{t("auth.systemTitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted tracking-widest font-barlow">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-3 bg-surface border border-surface-border rounded-xl text-foreground font-barlow text-base outline-none focus:border-primary transition-colors"
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted tracking-widest font-barlow">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-3 bg-surface border border-surface-border rounded-xl text-foreground font-barlow text-base outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm font-barlow">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-white rounded-xl font-barlow font-extrabold text-xl tracking-wide disabled:opacity-50 active:bg-primary-dark transition-colors mt-2"
          >
            {isLoading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>
      </div>
    </div>
  );
}
