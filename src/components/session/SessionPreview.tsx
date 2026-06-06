import { Card, Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

type SessionType = "partido" | "regular";

interface SessionPreviewProps {
  sessionType: SessionType;
  rival: string;
  sessionDate: string;
  sessionTime: string;
  selectedBranchesCount: number;
  assignedCount: number;
}

export default function SessionPreview({
  sessionType,
  rival,
  sessionDate,
  sessionTime,
  selectedBranchesCount,
  assignedCount,
}: SessionPreviewProps) {
  const { t } = useLanguage();

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString("es-CR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : t("session.noDate");

  return (
    <Card className="p-[22px] !border-primary/30 bg-gradient-to-br from-primary/10 to-primary/[0.02]">
      <div className="mb-3">
        <div className="t-label !text-[10px] mb-1.5">{t("session.preview")}</div>
        <div className="t-xs text-muted-foreground">{t("session.previewDesc")}</div>
      </div>
      <Badge variant="primary-soft" className="mb-2.5">
        {sessionType === "partido" ? t("session.match") : t("session.regular")}
      </Badge>
      <div className="t-h2 !text-2xl mb-1.5">
        {sessionType === "partido"
          ? rival
            ? `vs ${rival}`
            : t("session.vsRival")
          : t("session.regularOp")}
      </div>
      <div className="t-sm text-muted-foreground mb-3.5">
        {dateLabel}
        {sessionType === "partido" && sessionTime ? ` · ${sessionTime}` : ""}
      </div>
      <div className="separator mb-3" />
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="t-label !text-[10px]">{t("session.stations")}</div>
          <div className="text-lg font-extrabold font-display">{selectedBranchesCount}</div>
        </div>
        <div>
          <div className="t-label !text-[10px]">{t("session.assigned")}</div>
          <div className="text-lg font-extrabold font-display">
            {assignedCount}/{selectedBranchesCount}
          </div>
        </div>
      </div>
    </Card>
  );
}
