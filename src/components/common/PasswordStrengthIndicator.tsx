import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui/Icon";

interface PasswordRule {
  test: (password: string) => boolean;
  messageKey: string;
}

const passwordRules: PasswordRule[] = [
  { test: (pwd) => pwd.length >= 8, messageKey: "auth.register.passwordRequirements.minLength" },
  { test: (pwd) => /[a-z]/.test(pwd), messageKey: "auth.register.passwordRequirements.lowercase" },
  { test: (pwd) => /[A-Z]/.test(pwd), messageKey: "auth.register.passwordRequirements.uppercase" },
  { test: (pwd) => /[0-9]/.test(pwd), messageKey: "auth.register.passwordRequirements.number" },
  { test: (pwd) => /[^a-zA-Z0-9]/.test(pwd), messageKey: "auth.register.passwordRequirements.special" },
];

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const { t } = useLanguage();
  const strength = passwordRules.filter((rule) => rule.test(password)).length;

  const getStrengthBar = () => {
    if (strength === 0) return "bg-muted";
    if (strength <= 2) return "bg-destructive";
    if (strength <= 4) return "bg-warning";
    return "bg-success";
  };

  const getStrengthTextColor = () => {
    if (strength === 0) return "text-muted-foreground";
    if (strength <= 2) return "text-destructive";
    if (strength <= 4) return "text-warning";
    return "text-success";
  };

  const getStrengthText = () => {
    if (strength === 0) return t("auth.register.passwordStrength.veryWeak");
    if (strength <= 2) return t("auth.register.passwordStrength.weak");
    if (strength <= 4) return t("auth.register.passwordStrength.good");
    return t("auth.register.passwordStrength.strong");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between t-sm">
          <span className="text-muted-foreground">{t("auth.register.passwordStrength.label")}</span>
          <span className={cn("font-medium", getStrengthTextColor())}>{getStrengthText()}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                level <= strength ? getStrengthBar() : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Rules checklist */}
      <div className="space-y-2">
        {passwordRules.map((rule, index) => {
          const isValid = rule.test(password);
          return (
            <div key={index} className="flex items-center gap-2 t-sm">
              <Icon
                name={isValid ? "checkCircle" : "xCircle"}
                size={16}
                className={cn("flex-shrink-0", isValid ? "text-success" : "text-muted-foreground")}
              />
              <span className={cn("transition-colors", isValid ? "text-success" : "text-muted-foreground")}>
                {t(rule.messageKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
