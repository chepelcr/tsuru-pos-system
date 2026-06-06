import { useLanguage } from "@/contexts/LanguageContext";

export function useLanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    const next = language === "es" ? "en" : "es";
    const savedScrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
    document.body.classList.add("language-transitioning");

    setTimeout(() => {
      setLanguage(next);
      document.body.classList.remove("language-transitioning");
      document.body.classList.add("language-slide-in");

      setTimeout(() => {
        document.body.classList.remove("language-slide-in");
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo({ top: savedScrollY, behavior: "instant" as ScrollBehavior });
      }, 300);
    }, 300);
  };

  return { language, toggle };
}
