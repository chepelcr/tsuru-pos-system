import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface FormFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  style?: React.CSSProperties;
}

export function FormFooter({ onCancel, onSubmit, saving, submitLabel, cancelLabel, style }: FormFooterProps) {
  const { t } = useLanguage();
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", ...style }}>
      <Button variant="outline" onClick={onCancel} disabled={saving}>
        {cancelLabel ?? t("common.cancel")}
      </Button>
      {onSubmit ? (
        <Button variant="primary" onClick={onSubmit} disabled={saving}>
          {saving ? t("common.saving") : (submitLabel ?? t("common.save"))}
        </Button>
      ) : (
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? t("common.saving") : (submitLabel ?? t("common.save"))}
        </Button>
      )}
    </div>
  );
}
