export const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");

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
