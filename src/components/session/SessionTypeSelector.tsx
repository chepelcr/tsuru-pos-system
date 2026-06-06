import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

type SessionType = "partido" | "regular";

interface SessionTypeSelectorProps {
  sessionType: SessionType;
  setSessionType: (type: SessionType) => void;
  rival: string;
  setRival: (rival: string) => void;
  sessionTime: string;
  setSessionTime: (time: string) => void;
  sessionDate: string;
  setSessionDate: (date: string) => void;
}

export default function SessionTypeSelector({
  sessionType,
  setSessionType,
  rival,
  setRival,
  sessionTime,
  setSessionTime,
  sessionDate,
  setSessionDate,
}: SessionTypeSelectorProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-3.5">
      {/* Session type */}
      <div className="col-span-2">
        <label className="label">{t("session.sessionType")}</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "partido", icon: "trending", label: t("session.match"), desc: t("session.matchDesc") },
              { id: "regular", icon: "store", label: t("session.regular"), desc: t("session.regularDesc") },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setSessionType(o.id)}
              className={`p-3.5 text-left flex flex-col items-center gap-1.5 cursor-pointer transition-all rounded-lg ${
                sessionType === o.id
                  ? "border-2 border-primary bg-primary/[0.08]"
                  : "border border-border bg-card"
              }`}
            >
              <div
                className={`icon-pill w-10 h-10 flex-shrink-0 ${sessionType === o.id ? "" : "icon-pill-muted"}`}
              >
                <Icon name={o.icon} size={18} />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold mb-0.5">{o.label}</div>
                <div className="t-xs text-muted-foreground leading-relaxed">
                  {o.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {sessionType === "partido" && (
        <>
          <div>
            <label className="label">{t("session.rivalTeam")}</label>
            <input
              className="input"
              value={rival}
              onChange={(e) => setRival(e.target.value)}
              placeholder="vs Saprissa"
            />
          </div>
          <div>
            <label className="label">{t("session.matchTime")}</label>
            <input
              className="input"
              type="time"
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <label className="label">{t("session.date")}</label>
        <input
          className="input"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
        />
      </div>
    </div>
  );
}
