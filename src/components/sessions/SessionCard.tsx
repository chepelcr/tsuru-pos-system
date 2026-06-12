import { Card, Icon, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { fmt, formatDate } from "@/utils/formatDate";
import type { Session } from "@/types";

interface SessionCardProps {
  session: Session;
  endingPending: boolean;
  deletingPending: boolean;
  onView: (s: Session) => void;
  onEdit: (s: Session) => void;
  onEndSession: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  delay?: number;
}

export function SessionCard({ session, endingPending, deletingPending, onView, onEdit, onEndSession, onDeleteConfirm, delay = 0 }: SessionCardProps) {
  const { t } = useLanguage();
  // RBAC gating — `can` fails open until my-permissions resolves (log rollout).
  // Soft-delete also maps to update: admin/sessions has no grantable delete action.
  const { can } = usePermissions();
  const canUpdateSessions = can("admin", "update", "sessions");
  const isActive = session.status === 1;

  return (
    <FadeIn delay={delay} duration={0.4}>
      <Card className="px-5 py-[18px]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="text-base font-bold">{session.name}</span>
              <Badge variant={isActive ? "success" : "secondary"} className="text-[11px]">
                {isActive ? t("session.active") : t("session.closed")}
              </Badge>
              {session.context && (
                <Badge variant="secondary" className="text-[11px] capitalize">{session.context}</Badge>
              )}
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-[5px] text-xs text-muted-foreground">
                <Icon name="clock" size={11} />
                <span>{t("session.start")}: {formatDate(session.start_time)}</span>
              </div>
              {session.end_time && (
                <div className="flex items-center gap-[5px] text-xs text-muted-foreground">
                  <Icon name="clock" size={11} />
                  <span>{t("session.end")}: {formatDate(session.end_time)}</span>
                </div>
              )}
              {session.expected_revenue != null && (
                <div className="flex items-center gap-[5px] text-xs text-muted-foreground">
                  <Icon name="dollar" size={11} />
                  <span>{t("session.expected")}: {fmt(session.expected_revenue)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" icon="eye" onClick={() => onView(session)}>{t("session.viewDetail")}</Button>
            {isActive && canUpdateSessions && (
              <>
                <Button variant="outline" size="sm" icon="edit" onClick={() => onEdit(session)}>{t("common.edit")}</Button>
                <Button variant="outline" size="sm" icon="stop" onClick={() => onEndSession(session.session_id)} disabled={endingPending}>
                  {endingPending ? t("common.processing") : t("session.endSession")}
                </Button>
              </>
            )}
            {!isActive && canUpdateSessions && (
              <Button variant="ghost" size="sm" icon="trash" onClick={() => onDeleteConfirm(session.session_id)} disabled={deletingPending} className="!text-destructive">
                {t("common.delete")}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}
