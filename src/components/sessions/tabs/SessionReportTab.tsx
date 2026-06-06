import ReportePage from "@/pages/dashboard/ReportePage";

interface SessionReportTabProps {
  sessionId: string;
}

export function SessionReportTab({ sessionId }: SessionReportTabProps) {
  return <ReportePage sessionId={sessionId} />;
}
