// Money formatting lives in `@/lib/money` — a date module is not its home,
// and this copy rounded to whole colones.

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
