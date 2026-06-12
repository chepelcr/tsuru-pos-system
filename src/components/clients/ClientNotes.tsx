import { useState, useEffect } from "react";
import { Card, Button, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";

interface ClientNotesProps {
  notes?: string | null;
  onSave: (notes: string) => Promise<void>;
  isSaving?: boolean;
}

export function ClientNotes({ notes, onSave, isSaving }: ClientNotesProps) {
  const { t } = useLanguage();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("commercial", "update", "clients");

  const initial = notes ?? "";
  const [localNotes, setLocalNotes] = useState(initial);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalNotes(notes ?? "");
    setHasChanges(false);
  }, [notes]);

  const handleChange = (value: string) => {
    setLocalNotes(value);
    setHasChanges(value !== (notes ?? ""));
  };

  const handleSave = async () => {
    await onSave(localNotes);
    setHasChanges(false);
  };

  return (
    <Card className="px-6 py-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon name="fileText" size={14} className="text-accent-rose" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">
            {t("clients.notes.title")}
          </span>
        </div>
        {canUpdate && (
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? t("common.loading") : t("common.save")}
          </Button>
        )}
      </div>

      <textarea
        className="pp-input w-full min-h-[120px] resize-none"
        value={localNotes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("clients.notes.placeholder")}
      />

      {hasChanges && (
        <p className="t-xs text-muted-foreground mt-2">{t("clients.notes.unsavedChanges")}</p>
      )}
    </Card>
  );
}
